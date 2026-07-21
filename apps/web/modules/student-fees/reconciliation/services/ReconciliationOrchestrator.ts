import { prisma } from '../../../../shared/db/prisma';
import { AllocationStrategy } from '../types/AllocationStrategy';
import { WaterfallAllocationStrategy } from './strategies/WaterfallAllocationStrategy';
import { FeeAllocated, PartialPaymentRecorded, OverpaymentRecorded, AdvancePaymentRecorded, FeeTransactionCreated } from '../events/ReconciliationEvents';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus } from '@prisma/client';
import { logger } from '../../../../shared/logging/logger';

export class ReconciliationOrchestrator {
  private strategy: AllocationStrategy;

  constructor(strategy?: AllocationStrategy) {
    this.strategy = strategy || new WaterfallAllocationStrategy();
  }

  public async reconcile(studentMatchedPayload: any): Promise<void> {
    const { studentId, expectedAmount, paidAmount, matchedFeeMonth, paymentFingerprint } = studentMatchedPayload;

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { feeStructure: { include: { items: { include: { feeHead: true } } } } }
    });

    if (!student || !student.feeStructure) {
      throw new Error(`Cannot reconcile: Student ${studentId} lacks a FeeStructure`);
    }

    // 1. Execute Allocation Strategy
    const strategyResult = this.strategy.allocate({
      receivedAmount: paidAmount,
      expectedItems: student.feeStructure.items
    });

    // 2. Determine Business Status
    let status = 'PAID';
    if (strategyResult.unallocatedSurplus > 0) {
      status = 'OVERPAID';
    } else if (paidAmount < expectedAmount) {
      status = 'PARTIALLY_PAID';
    }

    const balanceRemaining = expectedAmount - paidAmount;

    // 3. Persist Everything Atomically
    await prisma.$transaction(async (tx) => {
      // Create Fee Transaction
      const transaction = await tx.feeTransaction.create({
        data: {
          studentId: student.id,
          feeStructureId: student.feeStructure!.id,
          expectedAmount,
          receivedAmount: paidAmount,
          balanceRemaining,
          feeMonth: matchedFeeMonth,
          paymentDate: new Date(),
          status,
          metadata: { paymentFingerprint },
          organizationId: student.organizationId
        }
      });

      // Create Allocations
      for (const alloc of strategyResult.allocations) {
        await tx.feeTransactionAllocation.create({
          data: {
            feeTransactionId: transaction.id,
            feeHeadId: alloc.feeHeadId,
            expectedAmount: alloc.expectedAmount,
            allocatedAmount: alloc.allocatedAmount,
            remainingAmount: alloc.remainingAmount,
            priority: alloc.priority
          }
        });
      }

      // Handle Advance Payment Surplus explicitly
      if (strategyResult.unallocatedSurplus > 0) {
        // Try to find the generic "ADVANCE" FeeHead, or fallback to null (if acceptable) or a known ADVANCE ID.
        // For now, we will create an allocation referencing a dynamic advance if configured.
        const advanceHead = await tx.feeHead.findFirst({ where: { type: 'ADVANCE' } });
        
        if (advanceHead) {
          await tx.feeTransactionAllocation.create({
            data: {
              feeTransactionId: transaction.id,
              feeHeadId: advanceHead.id,
              expectedAmount: 0,
              allocatedAmount: strategyResult.unallocatedSurplus,
              remainingAmount: 0, // It's a surplus
              priority: 999
            }
          });
        }
        
        const advanceEvent = new AdvancePaymentRecorded(transaction.id, 'FeeTransaction', { amount: strategyResult.unallocatedSurplus }, uuidv4());
        await this.insertOutboxEvent(tx, advanceEvent, student.organizationId);
      }

      // Generate Events based on status
      const coreEvent = new FeeAllocated(transaction.id, 'FeeTransaction', transaction, uuidv4());
      await this.insertOutboxEvent(tx, coreEvent, student.organizationId);

      if (status === 'PARTIALLY_PAID') {
        const partialEvent = new PartialPaymentRecorded(transaction.id, 'FeeTransaction', transaction, uuidv4());
        await this.insertOutboxEvent(tx, partialEvent, student.organizationId);
      } else if (status === 'OVERPAID') {
        const overEvent = new OverpaymentRecorded(transaction.id, 'FeeTransaction', transaction, uuidv4());
        await this.insertOutboxEvent(tx, overEvent, student.organizationId);
      }
    });

    logger.info(`Reconciliation completed for Student ${studentId}. Status: ${status}`);
  }

  private async insertOutboxEvent(tx: any, event: any, organizationId: string): Promise<void> {
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
  }
}
