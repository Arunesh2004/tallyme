import { prisma } from '../../../shared/db/prisma';
import { AccountingTransactionCreated } from '../events/MapperEvents';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus } from '@prisma/client';

export class AccountingTransactionRepository {
  /**
   * Persists the transaction immutably, and queues the Outbox event.
   * Leverages Prisma's Unique constraint on sourceEventId for idempotency.
   */
  public async persistAndPublish(resolvedTx: any, organizationId: string): Promise<string> {
    return await prisma.$transaction(async (tx) => {
      
      // 1. Check idempotency (Prisma will throw on unique constraint anyway, but we can be explicit)
      const existing = await tx.accountingTransaction.findUnique({
        where: { sourceEventId: resolvedTx.sourceEventId }
      });

      if (existing) {
        throw new Error(`IDEMPOTENCY_CONFLICT: Transaction for source event ${resolvedTx.sourceEventId} already exists.`);
      }

      // 2. Create the immutable transaction
      const transaction = await tx.accountingTransaction.create({
        data: {
          referenceId: resolvedTx.referenceId,
          referenceType: resolvedTx.referenceType,
          transactionDate: resolvedTx.transactionDate,
          description: resolvedTx.description,
          voucherType: resolvedTx.voucherType,
          sourceEventId: resolvedTx.sourceEventId,
          organizationId: organizationId,
          entries: {
            create: resolvedTx.entries.map((e: any) => ({
              ledgerId: e.ledgerId,
              debit: e.debit,
              credit: e.credit,
              costCenter: e.costCenter,
              narration: e.narration
            }))
          }
        },
        include: { entries: true }
      });

      // 3. Publish Event for Accounting Module
      const event = new AccountingTransactionCreated(transaction.id, 'AccountingTransaction', transaction, uuidv4());
      
      await tx.eventOutbox.create({
        data: {
          eventId: uuidv4(),
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          payload: JSON.parse(JSON.stringify(event.payload)),
          correlationId: event.correlationId,
          status: EventStatus.PENDING,
          organizationId
        }
      });

      return transaction.id;
    });
  }
}
