// src/modules/vendor-slip/domain/services/allocation.service.ts
import { Injectable } from '@nestjs/common';
import {
  InvoiceCandidate,
  VendorMatch,
  LedgerMapping,
  ExpenseAllocation,
} from '../entities';
import { InvoiceAmount } from '../value-objects';
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
    matchId: string,
  ): ExpenseAllocation {
    // (implementation note)
    const total =
      candidate.totalAmount && candidate.totalAmount.value
        ? candidate.totalAmount.value.toNumber()
        : 0;
    const base = total / 1.18; // (implementation note)
    const tax = total - base;

    const lineItems = [{ ledger: mapping.defaultLedgerCode, amount: total }];

    return new ExpenseAllocation(
      crypto.randomUUID(),
      matchId, // Passed matchId from upper orchestrator
      lineItems,
      candidate.totalAmount || new InvoiceAmount(0, 0, ''),
    );
  }
}
