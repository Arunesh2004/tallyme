import { VoucherCompilerRegistry } from '../compilers/VoucherCompilerRegistry';
import { VoucherValidator } from '../validators/VoucherValidator';
import { prisma } from '../../../../shared/db/prisma';
import { logger } from '../../../../shared/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus, SyncStatus } from '@prisma/client';

export class VoucherOrchestrator {
  private registry: VoucherCompilerRegistry;

  constructor() {
    this.registry = new VoucherCompilerRegistry();
  }

  public async generateVoucher(transactionEvent: any, organizationId: string): Promise<void> {
    const txPayload = transactionEvent.payload; // This is an AccountingTransaction
    const txId = txPayload.id;

    try {
      // 1. Idempotency Check
      const existing = await prisma.accountingVoucher.findUnique({
        where: { accountingTransactionId: txId }
      });
      if (existing) {
        logger.warn(`Idempotency Check: Voucher already generated for AccountingTransaction ${txId}`);
        return;
      }

      // 2. Compile
      const compiler = this.registry.resolve(txPayload.voucherType);
      const compiledVoucher = compiler.compile(txPayload, txPayload.entries);

      // 3. Validate
      await VoucherValidator.validate(compiledVoucher, organizationId);

      // 4. Persist Canonical Voucher
      await prisma.$transaction(async (tx) => {
        const voucher = await tx.accountingVoucher.create({
          data: {
            accountingTransactionId: compiledVoucher.accountingTransactionId,
            voucherType: compiledVoucher.voucherType,
            date: compiledVoucher.date,
            narration: compiledVoucher.narration,
            syncStatus: SyncStatus.PENDING,
            organizationId,
            validatedAt: new Date(),
            queuedAt: new Date(),
            entries: {
              create: compiledVoucher.entries.map(e => ({
                ledgerId: e.ledgerId,
                isDebit: e.isDebit,
                amount: e.amount,
                narration: e.narration
              }))
            }
          }
        });

        // 5. Emit VoucherCreated for Sync Engine
        await tx.eventOutbox.create({
          data: {
            eventId: uuidv4(),
            aggregateId: voucher.id,
            aggregateType: 'AccountingVoucher',
            eventType: 'VoucherCreated',
            payload: JSON.parse(JSON.stringify(voucher)),
            status: EventStatus.PENDING,
            organizationId
          }
        });
      });

      logger.info(`Successfully generated ERP-agnostic Voucher for Transaction ${txId}`);
    } catch (error: any) {
      logger.error(`Failed to generate voucher for Transaction ${txId}: ${error.message}`);
      
      if (error.message.includes('VOUCHER_VALIDATION_FAILURE') || error.message.includes('UNSUPPORTED_VOUCHER_TYPE')) {
        await this.handleFailure(txPayload, error.message, organizationId);
      } else {
        throw error;
      }
    }
  }

  private async handleFailure(payload: any, reason: string, organizationId: string): Promise<void> {
    await prisma.manualReview.create({
      data: {
        type: 'VOUCHER_VALIDATION_FAILURE',
        reason,
        payload,
        organizationId
      }
    });
    logger.warn(`Queued ManualReview for failed voucher generation of Transaction ${payload.id}`);
  }
}
