import { VoucherCompiler, CompiledVoucher, VoucherEntryInput } from './VoucherCompiler';

export class ReceiptVoucherCompiler implements VoucherCompiler {
  supportsType(): string {
    return 'RECEIPT';
  }

  compile(transaction: any, entries: any[]): CompiledVoucher {
    const compiledEntries: VoucherEntryInput[] = entries.map(e => {
      const isDebit = Number(e.debit) > 0;
      return {
        ledgerId: e.ledgerId,
        isDebit,
        amount: isDebit ? Number(e.debit) : Number(e.credit),
        narration: e.narration
      };
    });

    return {
      accountingTransactionId: transaction.id,
      voucherType: 'RECEIPT',
      date: new Date(transaction.transactionDate),
      narration: transaction.description,
      entries: compiledEntries
    };
  }
}

export class PaymentVoucherCompiler implements VoucherCompiler {
  supportsType(): string {
    return 'PAYMENT';
  }

  compile(transaction: any, entries: any[]): CompiledVoucher {
    const compiledEntries: VoucherEntryInput[] = entries.map(e => {
      const isDebit = Number(e.debit) > 0;
      return {
        ledgerId: e.ledgerId,
        isDebit,
        amount: isDebit ? Number(e.debit) : Number(e.credit),
        narration: e.narration
      };
    });

    return {
      accountingTransactionId: transaction.id,
      voucherType: 'PAYMENT',
      date: new Date(transaction.transactionDate),
      narration: transaction.description,
      entries: compiledEntries
    };
  }
}

export class JournalVoucherCompiler implements VoucherCompiler {
  supportsType(): string {
    return 'JOURNAL';
  }

  compile(transaction: any, entries: any[]): CompiledVoucher {
    const compiledEntries: VoucherEntryInput[] = entries.map(e => {
      const isDebit = Number(e.debit) > 0;
      return {
        ledgerId: e.ledgerId,
        isDebit,
        amount: isDebit ? Number(e.debit) : Number(e.credit),
        narration: e.narration
      };
    });

    return {
      accountingTransactionId: transaction.id,
      voucherType: 'JOURNAL',
      date: new Date(transaction.transactionDate),
      narration: transaction.description,
      entries: compiledEntries
    };
  }
}
