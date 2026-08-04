import { Injectable } from '@nestjs/common';
import { ERPConnectionManager } from './connection.manager';
import { ERPPayloadBuilder } from './payload.builder';
import { ERPResponseParser } from './response.parser';
import { VoucherMapperService } from './voucher-mapper.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERPRequestContext } from '../dto/transport.dto';
import { ERPSyncResult } from '../dto/orchestrator.dto';

@Injectable()
export class ERPConnectorEngine {
  constructor(
    private readonly connectionManager: ERPConnectionManager,
    private readonly mapper: VoucherMapperService,
    private readonly payloadBuilder: ERPPayloadBuilder,
    private readonly responseParser: ERPResponseParser,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Orchestrates the strict, unidirectional ERP synchronization workflow:
   * Voucher Source -> Mapper -> TallyVoucherDTO -> XML Builder -> Transport -> XML Response Parser -> ERPSyncResult
   */
  async syncVoucher(
    internalVoucherData: any,
    adapterCode: string,
    context: ERPRequestContext,
  ): Promise<ERPSyncResult> {
    const startTime = Date.now();

    this.logger.debug(
      {
        message: 'Beginning ERP orchestration workflow',
        voucherId: context.voucherId,
      },
      'ERPConnectorEngine',
    );

    // 1. Resolve Adapter & Connection
    const { adapter } =
      await this.connectionManager.getConnectionAndAdapter(adapterCode);

    // 2. Anti-Corruption Layer (Mapping)
    const transportContract = this.mapper.mapToTransport(internalVoucherData);

    // 3. Build Payload
    const payload = await this.payloadBuilder.build(adapter, transportContract);

    // TEMPORARY SAFE DEBUG LOGS
    const xmlLength = Buffer.byteLength(payload, 'utf8');
    const firstLevelTagsMatch = payload.match(/<[^/!>]+>/g) || [];
    // safe tags, not sensitive (only top level like ENVELOPE, HEADER, BODY, IMPORTDATA)
    const firstLevelStructure = firstLevelTagsMatch.slice(0, 10).join(', ');

    this.logger.log(
      {
        message: 'ERP_DEBUG_LOG_BEFORE_TRANSPORT',
        dtoReceived: {
          voucherNumber: transportContract.voucherNumber,
          companyId: transportContract.companyId,
          linesCount: transportContract.lines?.length,
        },
        xmlGeneratedLength: xmlLength,
        xmlFirstLevelStructure: firstLevelStructure,
        transportStatus: 'Ready to send',
      },
      'ERPConnectorEngine',
    );

    // 4. Send over Transport
    // We do not catch transport errors here. They propagate upward as ERPTransportException.
    const transportResult = await adapter.sendVoucher(payload, context);

    // 5. Parse & Normalize Response
    // We do not catch parser exceptions here. They propagate upward.
    const { parsed, isValid } = this.responseParser.parseAndValidate(
      adapter,
      transportResult,
    );

    const durationMs = Date.now() - startTime;

    // 6. Return standard Orchestrator Result
    return {
      success: isValid,
      referenceId: parsed.referenceId,
      responseType:
        parsed.responseCode || (isValid ? 'SUCCESS' : 'BUSINESS_ERROR'),
      message:
        parsed.message ||
        (isValid
          ? 'Successfully synchronized'
          : 'ERP returned failure response'),
      parserWarnings: parsed.parserWarnings || [],
      /** Audit trail fields — raw XML persisted to ERPSyncJob */
      requestXml: payload,
      rawResponse: transportResult.rawResponse,
      transportMetadata: {
        durationMs: transportResult.durationMs,
        httpStatus: transportResult.httpStatus,
        xmlHash: transportResult.xmlHash,
        payloadSizeBytes: transportResult.payloadSizeBytes,
      },
      durationMs,
    };
  }
  async verifyVoucherExists(
    criteria: {
      voucherNumber?: string;
      guid?: string;
      masterId?: string;
      externalInvoiceNumber?: string;
      voucherType?: string;
      partyLedger?: string;
      amount?: number;
      date?: Date;
    },
    adapterCode: string,
    context: ERPRequestContext,
  ): Promise<'EXISTS' | 'NOT_FOUND' | 'UNKNOWN'> {
    const { adapter } =
      await this.connectionManager.getConnectionAndAdapter(adapterCode);

    if (typeof adapter.verifyVoucherExists === 'function') {
      return adapter.verifyVoucherExists(criteria, context);
    }

    return 'UNKNOWN';
  }
}
