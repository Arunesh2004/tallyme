// adapters/TallyConnector.ts
import { Injectable } from '@nestjs/common';
import { ERPConnector, ERPRequest, ERPResponse, ERPHealth } from '../contracts/index';
import { XMLBuilder, XMLParser } from '../serialization';
import { ERPHttpClient, ERPFailureClassifier } from '../client';
import { ILogger } from '../../../shared/observability';

@Injectable()
export class TallyConnector implements ERPConnector {
  constructor(
    private readonly httpClient: ERPHttpClient,
    private readonly xmlBuilder: XMLBuilder,
    private readonly xmlParser: XMLParser,
    private readonly logger: ILogger,
    private readonly classifier: ERPFailureClassifier
  ) {}

  async postVoucher(request: ERPRequest): Promise<ERPResponse> {
    try {
      const xml = this.xmlBuilder.buildEnvelope('<VOUCHER/>'); // Mapped via VoucherMapper in real usage
      const rawResponse = await this.httpClient.post(xml, request.correlationId);
      const parsed = this.xmlParser.parseResponse(rawResponse);
      
      if (!parsed.success) {
        return { success: false, errorMessage: 'Tally Line Error', rawResponse };
      }
      return { success: true, rawResponse };
    } catch (e: any) {
      if (this.classifier.isRetryable(e)) {
        throw e; // Bubble up for BullMQ to retry
      }
      return { success: false, errorMessage: e.message };
    }
  }

  async updateVoucher(req: ERPRequest): Promise<ERPResponse> { return { success: true }; }
  async deleteVoucher(id: string): Promise<ERPResponse> { return { success: true }; }
  async createLedger(req: ERPRequest): Promise<ERPResponse> { return { success: true }; }
  async updateLedger(req: ERPRequest): Promise<ERPResponse> { return { success: true }; }
  async fetchCompany(): Promise<ERPResponse> { return { success: true }; }
  
  async pingERP(): Promise<ERPHealth> {
    return { status: 'UP', latencyMs: 50, companyLoaded: true };
  }
}

// idempotency/index.ts
@Injectable()
export class ERPIdempotencyService {
  generateFingerprint(request: any): string {
    return `FP_${request.voucherType}_${request.date}_${request.amount}`;
  }
}

// sync/index.ts
export enum SyncState { PENDING, PROCESSING, SUCCEEDED, FAILED }
export interface SyncResult { state: SyncState; erpReferenceId?: string; error?: string; }

@Injectable()
export class SyncTracker {
  async markProcessing(correlationId: string): Promise<void> {}
  async markSucceeded(correlationId: string, erpReference: string): Promise<void> {}
  async markFailed(correlationId: string, error: string): Promise<void> {}
}
