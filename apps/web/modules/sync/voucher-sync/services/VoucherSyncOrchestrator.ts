import { VoucherLoader } from './VoucherLoader';
import { SyncResponseHandler } from './SyncResponseHandler';
import { VoucherXmlBuilderAdapter } from '../adapters/VoucherXmlBuilderAdapter';
import { SyncResultClassification, NormalizedSyncResponse } from '../types/SyncResponseTypes';
import { prisma } from '../../../../shared/db/prisma';
import { logger } from '../../../../shared/logging/logger';
import { SyncStatus } from '@prisma/client';

export class VoucherSyncOrchestrator {
  private loader: VoucherLoader;
  private responseHandler: SyncResponseHandler;

  constructor() {
    this.loader = new VoucherLoader();
    this.responseHandler = new SyncResponseHandler();
  }

  public async syncVoucher(voucherId: string, organizationId: string, correlationId: string): Promise<void> {
    logger.info(`Starting sync for voucher ${voucherId}`, { correlationId });
    
    // 1. Load the Voucher
    const voucher = await this.loader.load(voucherId, organizationId);

    // 2. State Validation (Ensure it's PENDING or RETRYING)
    if (voucher.syncStatus !== SyncStatus.PENDING && voucher.syncStatus !== SyncStatus.RETRYING) {
      logger.warn(`Voucher ${voucherId} is in status ${voucher.syncStatus}, skipping sync.`);
      return;
    }

    const currentAttempt = voucher.syncAttempts + 1;

    // 3. Create Sync Session
    const session = await prisma.syncSession.create({
      data: {
        voucherId,
        attempt: currentAttempt,
        status: SyncStatus.PROCESSING,
        correlationId,
        organizationId
      }
    });

    // 4. Update Voucher to PROCESSING
    await prisma.accountingVoucher.update({
      where: { id: voucherId },
      data: { syncStatus: SyncStatus.PROCESSING }
    });

    try {
      const startTime = Date.now();

      // 5. Build XML
      const xmlPayload = VoucherXmlBuilderAdapter.build(voucher);
      
      // Update XML Request on Voucher for audit
      await prisma.accountingVoucher.update({
        where: { id: voucherId },
        data: { xmlRequest: xmlPayload }
      });

      // 6. Dispatch to Tally (MOCK TALLY CONNECTOR FOR NOW)
      // In a real system, we would inject and invoke the actual TallyConnector.send(xmlPayload).
      // Here, we simulate the network call and response logic.
      const simulatedResponse = await this.mockTallyConnector(xmlPayload);
      
      const durationMs = Date.now() - startTime;

      const normalizedResponse: NormalizedSyncResponse = {
        classification: simulatedResponse.status === 200 ? SyncResultClassification.SUCCESS : SyncResultClassification.VALIDATION_FAILURE,
        rawResponse: simulatedResponse.data,
        errorMessage: simulatedResponse.status === 200 ? undefined : simulatedResponse.error,
        durationMs
      };

      // 7. Handle Response
      const shouldRetry = await this.responseHandler.handleResponse(
        voucherId,
        session.id,
        normalizedResponse,
        currentAttempt,
        organizationId
      );

      if (shouldRetry) {
        // Enqueue retry job with exponential backoff logic (handled by BullMQ config outside this method)
        logger.info(`Voucher ${voucherId} queued for retry attempt ${currentAttempt + 1}`);
        throw new Error(`RETRY_REQUIRED_FOR_VOUCHER_${voucherId}`); // Throwing tells BullMQ to retry
      }

    } catch (error: any) {
      logger.error(`Unhandled error during sync for voucher ${voucherId}: ${error.message}`);
      
      // If it's the Retry throw, let it bubble up to BullMQ
      if (error.message.includes('RETRY_REQUIRED_FOR_VOUCHER')) throw error;
      
      // Otherwise, record catastrophic failure
      const normalizedResponse: NormalizedSyncResponse = {
        classification: SyncResultClassification.UNKNOWN,
        errorMessage: error.message,
        durationMs: 0
      };
      
      await this.responseHandler.handleResponse(
        voucherId,
        session.id,
        normalizedResponse,
        currentAttempt,
        organizationId
      );
    }
  }

  /**
   * Temporary Mock representing the existing Sync Engine's Tally Connector.
   * This allows us to verify logic without a live Tally instance.
   */
  private async mockTallyConnector(xml: string): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // For testing verification scripts, we can parse the XML or just return SUCCESS.
    // If we wanted to test failures, we could inject flags, but for now we default to SUCCESS unless modified by test.
    if (xml.includes('TRIGGER_TEMPORARY_FAILURE')) {
      return { status: 503, error: 'Tally Server Unavailable' };
    }
    if (xml.includes('TRIGGER_VALIDATION_FAILURE')) {
      return { status: 400, error: 'Invalid Ledger Name' };
    }
    
    return { status: 200, data: { created: 1, altered: 0, errors: 0 } };
  }
}
