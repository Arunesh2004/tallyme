// src/modules/vendor-slip/domain/services/voucher.service.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { ExpenseAllocation } from '../entities';
import { IDecimal } from '../../../../shared/types';
import * as crypto from 'crypto';

export class VoucherEntry {
  constructor(
    public readonly ledgerName: string,
    public readonly amount: IDecimal,
    public readonly isDebit: boolean,
  ) {}
}

export class VoucherCandidate {
  constructor(
    public readonly id: string,
    public readonly allocationId: string,
    public readonly voucherType: string,
    public readonly date: Date,
    public readonly narration: string,
    public readonly entries: VoucherEntry[],
  ) {}
}

@Injectable()
export class VoucherValidator {
  validate(candidate: VoucherCandidate): Result<boolean, string> {
    let debits = 0;
    let credits = 0;

    for (const entry of candidate.entries) {
      if (entry.amount.toNumber() <= 0)
        return fail('Voucher entries must have positive amounts');
      if (entry.isDebit) {
        debits += entry.amount.toNumber();
      } else {
        credits += entry.amount.toNumber();
      }
    }

    // Floating point safe comparison using Decimal wrappers would happen here. For stub:
    if (Math.abs(debits - credits) > 0.01) {
      return fail(
        `Voucher must balance. Debits: ${debits}, Credits: ${credits}`,
      );
    }

    if (!candidate.narration || candidate.narration.trim() === '') {
      return fail('Voucher narration is required');
    }

    return ok(true);
  }
}

@Injectable()
export class VoucherBuilder {
  constructor(private readonly validator: VoucherValidator) {}

  build(
    allocation: ExpenseAllocation,
    vendorLedger: string,
  ): Result<VoucherCandidate, string> {
    const entries: VoucherEntry[] = [];
    let totalDebit = 0;

    // Debit the expense/tax ledgers
    for (const line of allocation.lineItems) {
      entries.push(new VoucherEntry(line.ledger, line.amount, true));
      totalDebit += line.amount.toNumber();
    }

    // Credit the vendor ledger
    entries.push(
      new VoucherEntry(vendorLedger, allocation.totalAllocated.amount, false),
    );

    const candidate = new VoucherCandidate(
      crypto.randomUUID(),
      allocation.id,
      'Purchase',
      new Date(),
      `Being purchase invoice booked for allocation ${allocation.id}`,
      entries,
    );

    const validation = this.validator.validate(candidate);
    if (validation.isFailure) {
      return fail(validation.error);
    }

    return ok(candidate);
  }
}
