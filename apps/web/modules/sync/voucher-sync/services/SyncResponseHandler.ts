import { SyncResultClassification, NormalizedSyncResponse } from '../types/SyncResponseTypes';
import { prisma } from '../../../../shared/db/prisma';
import { SyncStatus } from '@prisma/client';
import { logger } from '../../../../shared/logging/logger';

export class SyncResponseHandler {
  private readonly MAX_RETRIES = 3;

  /**
   * Processes the normalized response, determines the next state,
   * updates the Voucher and SyncSession, and handles DLQ routing.
   * Returns a boolean indicating if a retry should be scheduled.
   */
  public async handleResponse(
    voucherId: string,
    sessionId: string,
    response: NormalizedSyncResponse,
    currentAttempt: number,
    organizationId: string
  ): Promise<boolean> {
    
    let nextStatus: SyncStatus;
    let shouldRetry = false;

    // 1. Classification Logic
    if (response.classification === SyncResultClassification.SUCCESS) {
      nextStatus = SyncStatus.SYNCED;
    } else if (
      response.classification === SyncResultClassification.TEMPORARY_FAILURE ||
      response.classification === SyncResultClassification.TIMEOUT
    ) {
      if (currentAttempt < this.MAX_RETRIES) {
        nextStatus = SyncStatus.RETRYING;
        shouldRetry = true;
      } else {
        nextStatus = SyncStatus.DEAD_LETTER;
      }
    } else {
      // VALIDATION_FAILURE, AUTH_FAILURE, CONFLICT, UNKNOWN
      nextStatus = SyncStatus.DEAD_LETTER;
    }

    // 2. Persist State
    await prisma.$transaction(async (tx) => {
      // Update the Session
      await tx.syncSession.update({
        where: { id: sessionId },
        data: {
          status: nextStatus,
          completedAt: new Date(),
          duration: response.durationMs,
          response: response.rawResponse || {},
          error: response.errorMessage
        }
      });

      // Update the Voucher
      await tx.accountingVoucher.update({
        where: { id: voucherId },
        data: {
          syncStatus: nextStatus,
          lastSyncAt: new Date(),
          syncAttempts: currentAttempt,
          lastSyncError: response.errorMessage,
          xmlResponse: response.rawResponse ? JSON.stringify(response.rawResponse) : null,
          ...(nextStatus === SyncStatus.SYNCED ? { syncedAt: new Date() } : {}),
          ...(nextStatus === SyncStatus.DEAD_LETTER ? { failedAt: new Date(), lastFailureReason: response.errorMessage } : {})
        }
      });

      // Update Global Metrics
      await tx.syncMetric.create({
        data: {
          eventId: sessionId,
          aggregateId: voucherId,
          aggregateType: 'AccountingVoucher',
          status: nextStatus === SyncStatus.SYNCED ? 'SUCCESS' : 'FAILED',
          durationMs: response.durationMs,
          retryCount: currentAttempt,
          errorReason: response.errorMessage,
          organizationId
        }
      });

      // 3. Dead Letter Queue Routing (Manual Review)
      if (nextStatus === SyncStatus.DEAD_LETTER) {
        await tx.manualReview.create({
          data: {
            type: 'VOUCHER_SYNC_FAILURE',
            reason: response.errorMessage || 'Max retries exceeded or non-retryable failure.',
            payload: { voucherId, sessionId, response },
            organizationId
          }
        });
        logger.warn(`Voucher ${voucherId} routed to DEAD_LETTER Queue (ManualReview).`);
      }
    });

    return shouldRetry;
  }
}
