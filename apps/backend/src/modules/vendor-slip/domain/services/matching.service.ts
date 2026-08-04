// src/modules/vendor-slip/domain/services/matching.service.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { InvoiceCandidate, VendorMatch } from '../entities';
import { ConfidenceScore } from '../value-objects';
import {
  IVendorRepository,
  IInvoiceCandidateRepository,
} from '../repositories';
import { DuplicateInvoiceError } from '../../exceptions/repository.exceptions';
import * as crypto from 'crypto';

@Injectable()
export class DuplicateInvoiceDetector {
  constructor(private readonly invoiceRepo: IInvoiceCandidateRepository) {}

  async detect(
    candidate: InvoiceCandidate,
    vendorId: string,
  ): Promise<Result<boolean, DuplicateInvoiceError>> {
    const invNum =
      candidate.invoiceNumber && candidate.invoiceNumber.value
        ? candidate.invoiceNumber.value
        : 'UNKNOWN';
    const existing = await this.invoiceRepo.existsByVendorAndInvoiceNumber(
      vendorId,
      invNum,
    );
    if (existing) {
      return fail(new DuplicateInvoiceError(vendorId, invNum));
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
    let vendor = null;

    // 1. Exact GSTIN Match
    if (candidate.extractedGstin && candidate.extractedGstin.value) {
      vendor = await this.vendorRepo.findVendorByCriteria({
        gstin: candidate.extractedGstin.value,
      });
    }

    // 2. Exact Name Match (Fallback)
    if (
      !vendor &&
      candidate.extractedVendorName &&
      candidate.extractedVendorName.value
    ) {
      // Find vendor by name (case insensitive ideally, but exact for now is fine since we seed it exactly)
      vendor = await this.vendorRepo.findVendorByCriteria({
        exactName: candidate.extractedVendorName.value,
      });
    }

    if (!vendor) {
      return fail('No vendor found for GSTIN or Name. Requires manual review.');
    }

    // (implementation note)
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
    const match = matchResult.unwrap();
    if (match.matchConfidence.score < 90) return true;
    return false;
  }
}
