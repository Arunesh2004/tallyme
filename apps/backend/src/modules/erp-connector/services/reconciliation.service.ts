import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async reconcileVoucher(
    voucherId: string,
    expectedPayload: any,
    tallyResponse: any,
  ) {
    this.logger.log(`Reconciling Voucher: ${voucherId}`);

    let isMatched = true;

    // 1. Voucher Structure Validation (Debit vs Credit Ledger correctness)
    const expectedDebits =
      expectedPayload.ledgers
        ?.filter((l: any) => l.amount > 0)
        .map((l: any) => l.name)
        .sort() || [];
    const expectedCredits =
      expectedPayload.ledgers
        ?.filter((l: any) => l.amount < 0)
        .map((l: any) => l.name)
        .sort() || [];

    const actualDebits =
      tallyResponse.ledgers
        ?.filter((l: any) => l.amount > 0)
        .map((l: any) => l.name)
        .sort() || [];
    const actualCredits =
      tallyResponse.ledgers
        ?.filter((l: any) => l.amount < 0)
        .map((l: any) => l.name)
        .sort() || [];

    if (
      JSON.stringify(expectedDebits) !== JSON.stringify(actualDebits) ||
      JSON.stringify(expectedCredits) !== JSON.stringify(actualCredits)
    ) {
      this.logger.warn(`Structure mismatch for ${voucherId}`);
      isMatched = false;
    }

    // 2. Amount Reconciliation
    const expectedAmount = expectedPayload.totalAmount || 0;
    const actualAmount = tallyResponse.totalAmount || 0;

    if (expectedAmount !== actualAmount) {
      this.logger.warn(
        `Amount mismatch for ${voucherId}: Expected ${expectedAmount}, Actual ${actualAmount}`,
      );
      isMatched = false;
    }

    // 3. Tax Reconciliation
    // Checking CGST, SGST, IGST totals if present
    const expectedTax = expectedPayload.taxAmount || 0;
    const actualTax = tallyResponse.taxAmount || 0;

    if (expectedTax !== actualTax) {
      this.logger.warn(`Tax mismatch for ${voucherId}`);
      isMatched = false;
    }

    const reconciliation = await this.prisma.accountingReconciliation.create({
      data: {
        voucherId,
        tallyVoucherNumber: tallyResponse.voucherNumber || null,
        expectedAmount,
        actualAmount,
        difference: Math.abs(expectedAmount - actualAmount),
        status: isMatched
          ? 'MATCHED'
          : actualAmount
            ? 'MISMATCHED'
            : 'REQUIRES_REVIEW',
      },
    });

    if (!isMatched) {
      await this.prisma.accountingException.create({
        data: {
          entityType: 'VOUCHER',
          entityId: voucherId,
          exceptionType: 'AMOUNT_MISMATCH',
          severity: 'HIGH',
          description:
            'Reconciliation failed due to structural or amount mismatch.',
          status: 'OPEN',
        },
      });
    }

    return reconciliation;
  }
}
