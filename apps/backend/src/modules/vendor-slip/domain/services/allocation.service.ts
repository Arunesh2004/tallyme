// src/modules/vendor-slip/domain/services/allocation.service.ts
import { Injectable } from '@nestjs/common';
import {
  InvoiceCandidate,
  VendorMatch,
  LedgerMapping,
  ExpenseAllocation,
} from '../entities';
import { IVendorLedgerProfileRepository } from '../repositories';
import * as crypto from 'crypto';

@Injectable()
export class LedgerMapper {
  constructor(private readonly profileRepo: IVendorLedgerProfileRepository) {}

  async map(match: VendorMatch): Promise<LedgerMapping | null> {
    return this.profileRepo.findLedgerMappingForVendor(match.vendorId);
  }
}

@Injectable()
export class ExpenseAllocator {
  allocate(
    candidate: InvoiceCandidate,
    mapping: LedgerMapping,
  ): ExpenseAllocation {
    // Basic allocation math stub
    const total = candidate.totalAmount.amount.toNumber();
    const base = total / 1.18; // Assuming 18% GST for stub
    const tax = total - base;

    const lineItems = [
      { ledger: mapping.defaultLedgerCode, amount: base },
      { ledger: 'GST_INPUT', amount: tax },
    ];

    return new ExpenseAllocation(
      crypto.randomUUID(),
      match.id, // Should pass matchId from upper orchestrator
      lineItems,
      candidate.totalAmount,
    );
  }
}
