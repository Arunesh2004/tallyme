import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IVoucherRepository } from '../interfaces/voucher.interfaces';
import { VOUCHER_REPOSITORY } from '../constants/voucher.constants';

@Injectable()
export class LedgerResolver {
  constructor(
    @Inject(VOUCHER_REPOSITORY) private readonly repository: IVoucherRepository,
  ) {}

  async resolveDebitLedger(paymentData: any): Promise<any> {
    const ledgerName = paymentData.gatewayLedgerName;
    const ledger = await this.repository.findLedgerByName(ledgerName);
    if (!ledger) {
      throw new NotFoundException(`Ledger not found: ${ledgerName}`);
    }
    return ledger;
  }

  async resolveCreditLedger(feeHeadName: string): Promise<any> {
    // Match fee head to a specific ledger
    const ledgerName = `${feeHeadName} Fees`;
    const ledger = await this.repository.findLedgerByName(ledgerName);
    if (!ledger) {
      throw new NotFoundException(`Ledger not found: ${ledgerName}`);
    }
    return ledger;
  }

  async resolveAdvanceLedger(): Promise<any> {
    const ledgerName = 'Student Advance';
    const ledger = await this.repository.findLedgerByName(ledgerName);
    if (!ledger) {
      throw new NotFoundException(`Ledger not found: ${ledgerName}`);
    }
    return ledger;
  }
}
