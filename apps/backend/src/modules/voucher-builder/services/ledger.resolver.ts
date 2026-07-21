import { Injectable, Inject } from '@nestjs/common';
import { IVoucherRepository } from '../interfaces/voucher.interfaces';
import { VOUCHER_REPOSITORY } from '../constants/voucher.constants';

@Injectable()
export class LedgerResolver {
  constructor(
    @Inject(VOUCHER_REPOSITORY) private readonly repository: IVoucherRepository,
  ) {}

  async resolveDebitLedger(paymentData: any): Promise<any> {
    // Determine Bank or Cash ledger based on payment gateway
    const ledgerName = paymentData.gateway === 'cash' ? 'Cash' : 'Bank';
    let ledger = await this.repository.findLedgerByName(ledgerName);
    if (!ledger) {
      // Mock fallback
      ledger = { id: 'mock_ledger_id_bank', name: ledgerName };
    }
    return ledger;
  }

  async resolveCreditLedger(feeHeadName: string): Promise<any> {
    // Match fee head to a specific ledger
    const ledgerName = `${feeHeadName} Fees`;
    let ledger = await this.repository.findLedgerByName(ledgerName);
    if (!ledger) {
      // Mock fallback
      ledger = { id: `mock_ledger_id_${feeHeadName}`, name: ledgerName };
    }
    return ledger;
  }

  async resolveAdvanceLedger(): Promise<any> {
    const ledgerName = 'Student Advance';
    let ledger = await this.repository.findLedgerByName(ledgerName);
    if (!ledger) {
      // Mock fallback
      ledger = { id: 'mock_ledger_id_advance', name: ledgerName };
    }
    return ledger;
  }
}
