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

    // ── 1. Voucher Structure Validation (Debit vs Credit Ledger names) ───
    // TallyVoucherDTO uses `lines` — NOT `ledgers` (FIX: aligned field name)
    const expectedDebits = (
      expectedPayload.lines ??
      expectedPayload.ledgers ??
      []
    )
      .filter((l: any) => l.isDebit === true)
      .map((l: any) => l.ledgerName ?? l.name)
      .filter(Boolean)
      .sort();

    const expectedCredits = (
      expectedPayload.lines ??
      expectedPayload.ledgers ??
      []
    )
      .filter((l: any) => l.isDebit === false)
      .map((l: any) => l.ledgerName ?? l.name)
      .filter(Boolean)
      .sort();

    const actualDebits = (tallyResponse.lines ?? tallyResponse.ledgers ?? [])
      .filter((l: any) => l.isDebit === true)
      .map((l: any) => l.ledgerName ?? l.name)
      .filter(Boolean)
      .sort();

    const actualCredits = (tallyResponse.lines ?? tallyResponse.ledgers ?? [])
      .filter((l: any) => l.isDebit === false)
      .map((l: any) => l.ledgerName ?? l.name)
      .filter(Boolean)
      .sort();

    if (
      JSON.stringify(expectedDebits) !== JSON.stringify(actualDebits) ||
      JSON.stringify(expectedCredits) !== JSON.stringify(actualCredits)
    ) {
      this.logger.warn(
        `Ledger structure mismatch for ${voucherId}`,
        undefined,
        ReconciliationService.name,
      );
      isMatched = false;
    }

    // ── 2. Amount Reconciliation ─────────────────────────────────────────
    // Sum debit amounts from lines (positive values expected on debit side)
    const expectedDebitTotal = (
      expectedPayload.lines ??
      expectedPayload.ledgers ??
      []
    )
      .filter((l: any) => l.isDebit === true)
      .reduce(
        (sum: number, l: any) => sum + Math.abs(Number(l.amount) || 0),
        0,
      );

    const actualDebitTotal = (
      tallyResponse.lines ??
      tallyResponse.ledgers ??
      []
    )
      .filter((l: any) => l.isDebit === true)
      .reduce(
        (sum: number, l: any) => sum + Math.abs(Number(l.amount) || 0),
        0,
      );

    // Fallback to totalAmount field when available (backwards compat)
    const expectedAmount = expectedPayload.totalAmount ?? expectedDebitTotal;
    const actualAmount = tallyResponse.totalAmount ?? actualDebitTotal;

    if (Math.abs(expectedAmount - actualAmount) > 0.01) {
      this.logger.warn(
        `Amount mismatch for ${voucherId}: Expected ${expectedAmount}, Actual ${actualAmount}`,
        undefined,
        ReconciliationService.name,
      );
      isMatched = false;
    }

    // ── 3. Tax Reconciliation ────────────────────────────────────────────
    const expectedTax = expectedPayload.taxAmount ?? 0;
    const actualTax = tallyResponse.taxAmount ?? 0;

    if (Math.abs(expectedTax - actualTax) > 0.01) {
      this.logger.warn(
        `Tax mismatch for ${voucherId}: Expected ${expectedTax}, Actual ${actualTax}`,
        undefined,
        ReconciliationService.name,
      );
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
