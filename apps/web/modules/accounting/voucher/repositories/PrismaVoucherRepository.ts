import { prisma } from '../../../../shared/db/prisma';
import { Voucher } from '../entities/Voucher';
import { VoucherResult } from '../types/VoucherResult';
import { VoucherCreatedEvent } from '../../shared/events/AccountingEvents';
import { v4 as uuidv4 } from 'uuid';

export class PrismaVoucherRepository {
  public async saveVoucher(entity: Voucher, organizationId: string = 'org_default'): Promise<VoucherResult> {
    try {
      const aggregateId = uuidv4();
      const correlationId = uuidv4();
      const eventId = uuidv4();

      await prisma.$transaction(async (tx) => {
        // 1. Persist Domain Entity
        await tx.accountingVoucher.create({
          data: {
            id: aggregateId,
            voucherNumber: entity.voucherNumber || null,
            voucherType: entity.voucherType,
            date: entity.date,
            payload: entity as any,
            syncStatus: 'PENDING',
            organizationId: organizationId,
            correlationId: correlationId,
            sourceSystem: 'TallyMe'
          }
        });

        // 2. Persist Outbox Event
        const event = new VoucherCreatedEvent(eventId, aggregateId, entity, correlationId);
        
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
        message: 'Voucher successfully saved to database and queued for sync.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to persist Voucher.',
        errors: [error.message]
      };
    }
  }
}
