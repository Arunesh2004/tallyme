// src/modules/vendor-slip/domain/services/matching.service.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { InvoiceCandidate, VendorMatch } from '../entities';
import { ConfidenceScore } from '../value-objects';
import { IVendorRepository, IInvoiceRepository } from '../repositories';
import { DuplicateInvoiceError } from '../../exceptions/repository.exceptions';
import * as crypto from 'crypto';

@Injectable()
export class DuplicateInvoiceDetector {
  constructor(private readonly invoiceRepo: IInvoiceRepository) {}

  async detect(
    candidate: InvoiceCandidate,
    vendorId: string,
  ): Promise<Result<boolean, DuplicateInvoiceError>> {
    const existing = await this.invoiceRepo.findByVendorAndNumber(
      vendorId,
      candidate.invoiceNumber.value,
    );
    if (existing) {
      return fail(
        new DuplicateInvoiceError(vendorId, candidate.invoiceNumber.value),
      );
    }
    return ok(false);
  }
}

@Injectable()
export class VendorMatcher {
  constructor(private readonly vendorRepo: IVendorRepository) {}

  async match(
    candidate: InvoiceCandidate,
  ): Promise<Result<VendorMatch, string>> {
    if (!candidate.extractedGstin)
      return fail('Missing GSTIN. Requires manual review.');

    // 1. Exact GSTIN Match
    const vendor = await this.vendorRepo.findVendorByCriteria({
      gstin: candidate.extractedGstin.value,
    });
    if (!vendor) return fail('No vendor found for GSTIN.');

    // 2. Calculate Confidence (stubbed)
    const confidence = new ConfidenceScore(99);

    return ok(
      new VendorMatch(crypto.randomUUID(), candidate.id, vendor.id, confidence),
    );
  }
}

@Injectable()
export class ManualReviewPolicy {
  evaluate(
    candidate: InvoiceCandidate,
    matchResult: Result<VendorMatch, string>,
  ): boolean {
    if (matchResult.isFailure) return true;
    if (candidate.confidence.score < 80) return true;
    const match = matchResult.getValue();
    if (match.matchConfidence.score < 90) return true;
    return false;
  }
}
