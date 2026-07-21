import { LedgerResolver } from './LedgerResolver';
import { DoubleEntryValidator } from './DoubleEntryValidator';
import { RawAccountingTransaction, ResolvedAccountingEntry } from '../types/AccountingDTOs';

export class AccountingTransactionBuilder {
  private ledgerResolver: LedgerResolver;

  constructor(ledgerResolver: LedgerResolver) {
    this.ledgerResolver = ledgerResolver;
  }

  public async build(rawTx: RawAccountingTransaction, organizationId: string) {
    const resolvedEntries: ResolvedAccountingEntry[] = [];

    // 1. Resolve Ledgers
    for (const rawEntry of rawTx.entries) {
      const ledgerId = await this.ledgerResolver.resolve(rawEntry.mappingKey, organizationId);
      resolvedEntries.push({
        ledgerId,
        debit: rawEntry.debit,
        credit: rawEntry.credit,
        costCenter: rawEntry.costCenter,
        narration: rawEntry.narration
      });
    }

    // 2. Validate Double Entry Math
    DoubleEntryValidator.validate(resolvedEntries);

    // 3. Return the fully resolved, mathematically validated payload ready for persistence
    return {
      referenceId: rawTx.referenceId,
      referenceType: rawTx.referenceType,
      transactionDate: rawTx.transactionDate,
      description: rawTx.description,
      voucherType: rawTx.voucherType,
      sourceEventId: rawTx.sourceEventId,
      entries: resolvedEntries
    };
  }
}
