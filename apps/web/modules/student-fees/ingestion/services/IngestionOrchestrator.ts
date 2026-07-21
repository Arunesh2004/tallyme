import { MessageProvider } from '../adapters/MessageProvider';
import { PrismaIngestionMessageRepository } from '../repositories/PrismaIngestionMessageRepository';
import { NormalizedMessage } from '../types/IngestionTypes';
import { StudentFeeMessageReceived } from '../events/StudentFeeMessageReceived';
import { prisma } from '../../../../shared/db/prisma';
import { logger } from '../../../../shared/logging/logger';
import { EventStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export class IngestionOrchestrator {
  constructor(
    private repository: PrismaIngestionMessageRepository,
    private providers: MessageProvider[]
  ) {}

  /**
   * Polls all registered providers for new messages.
   */
  public async pollAll(query?: string): Promise<void> {
    for (const provider of this.providers) {
      logger.info(`Polling provider: ${provider.providerName}`);
      await this.pollProvider(provider, query);
    }
  }

  private async pollProvider(provider: MessageProvider, query?: string): Promise<void> {
    try {
      await provider.authenticate();
      const newMessages = await provider.fetchNewMessages(query);
      logger.info(`Fetched ${newMessages.length} new messages from ${provider.providerName}`);

      let ingestedCount = 0;
      let duplicateIdCount = 0;
      let duplicateHashCount = 0;

      for (const msg of newMessages) {
        // 1. Compute Hash
        const payloadHash = this.computeHash(msg);

        // 2. Duplicate checks
        const isDuplicateId = await this.repository.existsByMessageId(msg.provider, msg.messageId);
        if (isDuplicateId) {
          duplicateIdCount++;
          continue; // Skip
        }

        const isDuplicateHash = await this.repository.existsByPayloadHash(msg.provider, payloadHash);
        if (isDuplicateHash) {
          duplicateHashCount++;
          // We can optionally store it as 'DUPLICATE' status, but instructions say "ignored"
          continue; 
        }

        // 3. Transactional Outbox
        await this.ingestMessage(msg, payloadHash);
        ingestedCount++;
      }

      logger.info(`Polling complete for ${provider.providerName}. Ingested: ${ingestedCount}, Dup(ID): ${duplicateIdCount}, Dup(Hash): ${duplicateHashCount}`);
    } catch (error: any) {
      logger.error(`Error during polling for ${provider.providerName}`, { error: error.message });
    }
  }

  private async ingestMessage(msg: NormalizedMessage, payloadHash: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Insert IngestionMessage
      const ingestionRecord = await tx.ingestionMessage.create({
        data: {
          provider: msg.provider,
          messageId: msg.messageId,
          threadId: msg.threadId,
          historyId: msg.historyId,
          labelIds: msg.labelIds ? JSON.parse(JSON.stringify(msg.labelIds)) : null,
          subject: msg.subject,
          fromEmail: msg.fromEmail,
          payloadHash: payloadHash,
          status: 'PUBLISHED', // It's published to the Outbox immediately
          receivedAt: msg.receivedAt,
          organizationId: 'org_default' // Assuming default org
        }
      });

      // 2. Generate Domain Event
      const event = new StudentFeeMessageReceived(
        ingestionRecord.id,
        'IngestionMessage',
        {
          provider: msg.provider,
          messageId: msg.messageId,
          subject: msg.subject,
          sender: msg.fromEmail,
          threadId: msg.threadId,
          receivedAt: msg.receivedAt
        },
        uuidv4() // correlationId
      );

      // 3. Insert into Outbox
      await tx.eventOutbox.create({
        data: {
          eventId: uuidv4(),
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          payload: JSON.parse(JSON.stringify(event.payload)),
          correlationId: event.correlationId,
          status: EventStatus.PENDING,
          organizationId: 'org_default'
        }
      });
    });
  }

  private computeHash(msg: NormalizedMessage): string {
    const rawString = `${msg.subject}|${msg.fromEmail}|${msg.bodyText}`;
    return crypto.createHash('sha256').update(rawString).digest('hex');
  }
}
