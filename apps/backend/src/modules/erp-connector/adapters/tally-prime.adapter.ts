import { Injectable } from '@nestjs/common';
import { BaseERPAdapter } from './base.adapter';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { TallyTransportService } from '../services/transport.service';
import { ERPRequestContext, TransportResult } from '../dto/transport.dto';
import { TallyXmlParserService } from '../services/xml-parser.service';
import { ERPResponse } from '../dto/response.dto';

@Injectable()
export class TallyPrimeAdapter extends BaseERPAdapter {
  constructor(
    private readonly xmlBuilder: TallyXmlBuilderService,
    private readonly transport: TallyTransportService,
    private readonly xmlParser: TallyXmlParserService,
  ) {
    super();
  }

  async connect(): Promise<boolean> {
    return this.transport.checkHealth();
  }

  async disconnect(): Promise<void> {
    // Tally HTTP integration is stateless; no disconnection required.
  }

  async healthCheck(): Promise<boolean> {
    return this.transport.checkHealth();
  }

  buildPayload(voucherData: TallyVoucherDTO): string {
    return this.xmlBuilder.buildVoucherXml(voucherData);
  }

  async sendVoucher(
    payload: string,
    context: ERPRequestContext,
  ): Promise<TransportResult> {
    // Completely payload-agnostic transport delegation.
    return this.transport.send(payload, context);
  }

  parseResponse(response: TransportResult): ERPResponse {
    return this.xmlParser.parse(response);
  }

  validateResponse(parsedResponse: ERPResponse): boolean {
    // Basic validation; orchestration checks status independently
    return parsedResponse && parsedResponse.success;
  }

  async verifyVoucherExists(
    voucherNumber: string,
    context: ERPRequestContext,
  ): Promise<'EXISTS' | 'NOT_FOUND' | 'UNKNOWN'> {
    try {
      // 1. Build the Export XML query
      const payload = this.xmlBuilder.buildExportXml(voucherNumber);

      // 2. Send via transport
      const transportResult = await this.transport.send(payload, context);

      // 3. Simple inspection of the raw response
      // Tally returns <ENVELOPE> ... </ENVELOPE>
      // If it contains <VOUCHER>, it exists.
      // If it says "No entries", it does not exist.
      if (
        transportResult.rawResponse.includes('<VOUCHER>') ||
        transportResult.rawResponse.includes('<VOUCHER ')
      ) {
        return 'EXISTS';
      }

      if (
        transportResult.rawResponse.includes('No entries') ||
        transportResult.rawResponse.includes('No Entries')
      ) {
        return 'NOT_FOUND';
      }

      // If we got an unexpected response but it was a valid 200 OK without vouchers, we might assume NOT_FOUND,
      // but to be perfectly safe, UNKNOWN triggers another retry limit.
      // Let's assume an empty response or unexpected XML means NOT_FOUND if it's well-formed but empty.
      if (
        transportResult.rawResponse.includes('<DATA>') &&
        !transportResult.rawResponse.includes('<VOUCHER')
      ) {
        return 'NOT_FOUND';
      }

      return 'UNKNOWN';
    } catch (error) {
      // Transport timeouts, socket hangs, etc. map to UNKNOWN
      return 'UNKNOWN';
    }
  }
}
