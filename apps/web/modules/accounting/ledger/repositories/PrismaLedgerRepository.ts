import { prisma } from '../../../../shared/db/prisma';
import { Ledger } from '../entities/Ledger';
import { LedgerResult } from '../types/LedgerResult';
import { LedgerCreatedEvent } from '../../shared/events/AccountingEvents';
import { v4 as uuidv4 } from 'uuid';

export class PrismaLedgerRepository {
  public async saveLedger(entity: Ledger, organizationId: string = 'org_default'): Promise<LedgerResult> {
    try {
      const aggregateId = uuidv4();
      const correlationId = uuidv4();
      const eventId = uuidv4();

      await prisma.$transaction(async (tx) => {
        // 1. Persist Domain Entity
        await tx.accountingLedger.create({
          data: {
            id: aggregateId,
            name: entity.name,
            parentGroup: entity.parentGroup,
            payload: entity as any,
            syncStatus: 'PENDING',
            organizationId: organizationId,
            correlationId: correlationId,
            sourceSystem: 'TallyMe'
          }
        });

        // 2. Persist Outbox Event
        const event = new LedgerCreatedEvent(eventId, aggregateId, entity, correlationId);
        
        await tx.eventOutbox.create({
          data: {
            id: eventId,
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            eventType: event.eventType,
            payload: event.payload as any,
            correlationId: event.correlationId,
            status: 'PENDING',
            organizationId: organizationId
          }
        });
      });

      return {
        success: true,
        message: 'Ledger successfully saved to database and queued for sync.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to persist Ledger.',
        errors: [error.message]
      };
    }
  }
}
