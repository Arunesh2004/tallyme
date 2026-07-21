import { Injectable, Inject } from '@nestjs/common';
import { ERPConnectionManager } from './connection.manager';
import { ERPPayloadBuilder } from './payload.builder';
import { ERPResponseParser } from './response.parser';
import { ERPRetryService } from './retry.service';
import { IERPRepository } from '../interfaces/erp.interfaces';
import { ERP_REPOSITORY, ERP_SYNC_STATUS } from '../constants/erp.constants';
import { ERPConnectionException } from '../exceptions/erp.exceptions';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class ERPConnectorEngine {
  constructor(
    private readonly connectionManager: ERPConnectionManager,
    private readonly payloadBuilder: ERPPayloadBuilder,
    private readonly responseParser: ERPResponseParser,
    private readonly retryService: ERPRetryService,
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
    private readonly logger: LoggerService,
  ) {}

  async syncVoucher(voucherCandidate: any, adapterCode: string): Promise<any> {
    const startTime = Date.now();

    // 1. Resolve Adapter & Connection
    const { adapter } =
      await this.connectionManager.getConnectionAndAdapter(adapterCode);

    // 2. Build Payload
    const payload = this.payloadBuilder.build(adapter, voucherCandidate);

    let syncResult;
    let success = false;
    let errorMessage = null;

    try {
      // 3. Send
      const rawResponse = await adapter.sendVoucher(payload);

      // 4. Parse & Validate
      const { parsed, isValid } = this.responseParser.parseAndValidate(
        adapter,
        rawResponse,
      );

      success = isValid;
      syncResult = parsed;
      if (!isValid) errorMessage = 'ERP returned failure response';
    } catch (error) {
      errorMessage = (error as Error).message;
      if (this.retryService.shouldRetry(error)) {
        throw new ERPConnectionException(`Connection failed: ${errorMessage}`); // will be caught by worker for retry
      }
    }

    const duration = Date.now() - startTime;

    return {
      success,
      erpReferenceId: syncResult?.masterId,
      status: success ? ERP_SYNC_STATUS.SUCCESS : ERP_SYNC_STATUS.FAILED,
      duration,
      payload,
      response: syncResult,
      errorMessage,
    };
  }
}
