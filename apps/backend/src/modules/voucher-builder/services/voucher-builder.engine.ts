import { Injectable } from '@nestjs/common';
import { LedgerResolver } from './ledger.resolver';
import { ReferenceGenerator } from './reference.generator';
import { NarrationBuilder } from './narration.builder';
import { VoucherValidator } from './voucher.validator';
import { VoucherBuildResult } from '../interfaces/voucher.interfaces';
import { VOUCHER_TYPES, VOUCHER_STATUS } from '../constants/voucher.constants';

import { VoucherStrategyFactory } from './strategies/voucher.strategy.factory';

@Injectable()
export class VoucherBuilderEngine {
  constructor(private readonly strategyFactory: VoucherStrategyFactory) {}

  /**
   * Main entry point for the Shared Accounting Engine.
   * Dispatches to the appropriate strategy based on payload type.
   */
  async build(payload: any): Promise<VoucherBuildResult> {
    const type = payload.voucherType || 'RECEIPT';
    const strategy = this.strategyFactory.getStrategy(type);
    return strategy.build(payload);
  }
}
