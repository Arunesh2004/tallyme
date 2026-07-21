import { LedgerResolver } from './LedgerResolver';
import { AccountingTransactionBuilder } from './AccountingTransactionBuilder';
import { AccountingTransactionRepository } from './AccountingTransactionRepository';
import { StudentFeeMappingProfile } from '../mapping-profiles/StudentFeeMappingProfile';
import { logger } from '../../../../shared/logging/logger';
import { prisma } from '../../../../shared/db/prisma';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus } from '@prisma/client';

export class AccountingMapperOrchestrator {
  private builder: AccountingTransactionBuilder;
  private repository: AccountingTransactionRepository;

  constructor() {
    this.builder = new AccountingTransactionBuilder(new LedgerResolver());
    this.repository = new AccountingTransactionRepository();
  }

  public async mapEvent(eventType: string, eventPayload: any, eventId: string, organizationId: string): Promise<void> {
    try {
      let rawTx;

      // 1. Select Mapping Profile
      if (eventType === 'FeeAllocated') {
        const profile = new StudentFeeMappingProfile();
        rawTx = profile.map(eventPayload, eventId);
      } else {
        logger.warn(`No mapping profile found for event type: ${eventType}`);
        return; // Ignore unsupported events safely
      }

      // 2. Build and Validate
      const resolvedTx = await this.builder.build(rawTx, organizationId);

      // 3. Persist
      await this.repository.persistAndPublish(resolvedTx, organizationId);
      logger.info(`Successfully mapped event ${eventId} to AccountingTransaction ${resolvedTx.referenceId}`);

    } catch (error: any) {
      logger.error(`Failed to map event ${eventId}: ${error.message}`);
      
      // Safety Fallback: Enqueue a Manual Review if it's a mapping or balance error
      if (error.message.includes('MISSING_LEDGER_MAPPING') || error.message.includes('IMBALANCED_TRANSACTION')) {
        await this.handleMappingFailure(eventId, eventType, eventPayload, error.message, organizationId);
      } else {
        throw error; // Rethrow unexpected DB errors
      }
    }
  }

  private async handleMappingFailure(eventId: string, eventType: string, payload: any, reason: string, organizationId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const review = await tx.manualReview.create({
        data: {
          type: 'ACCOUNTING_MAPPING_FAILURE',
          reason: `Failed to map ${eventType}: ${reason}`,
          payload: { eventId, originalPayload: payload },
          organizationId
        }
      });
      
      // Optionally queue a ManualReviewCreated event here
    });
    logger.warn(`Queued ManualReview for failed mapping of event ${eventId}`);
  }
}
