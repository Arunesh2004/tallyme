// services/index.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../shared/domain/result';
import { InvoiceCandidate, VendorMatch, ExpenseAllocation, LedgerMapping } from '../entities';
import { IVendorRepository, IVendorLedgerProfileRepository } from '../repositories';

export interface OCRProvider {
  extractText(documentUrl: string): Promise<string>;
}

export interface AIExtractor {
  extractInvoiceData(rawText: string): Promise<InvoiceCandidate>;
}

@Injectable()
export class OCRCoordinator {
  constructor(private readonly ocrProvider: OCRProvider) {}
  async runOCR(documentUrl: string): Promise<string> {
    return this.ocrProvider.extractText(documentUrl);
  }
}

@Injectable()
export class InvoiceExtractor {
  constructor(private readonly aiExtractor: AIExtractor) {}
  async extract(rawText: string): Promise<InvoiceCandidate> {
    return this.aiExtractor.extractInvoiceData(rawText);
  }
}

@Injectable()
export class VendorMatcher {
  constructor(private readonly vendorRepo: IVendorRepository) {}
  async match(candidate: InvoiceCandidate): Promise<Result<VendorMatch, string>> {
    const query = { gstin: candidate.extractedGstin?.value };
    const vendor = await this.vendorRepo.findVendorByCriteria(query);
    if (!vendor) return fail('Vendor not found for given GSTIN. Manual review required.');
    
    // Stub
    return ok(new VendorMatch(crypto.randomUUID(), candidate.id, vendor.id, candidate.confidence));
  }
}

@Injectable()
export class LedgerMapper {
  constructor(private readonly ledgerProfileRepo: IVendorLedgerProfileRepository) {}
  async map(match: VendorMatch): Promise<LedgerMapping | null> {
    return this.ledgerProfileRepo.findLedgerMappingForVendor(match.vendorId);
  }
}

@Injectable()
export class ExpenseAllocator {
  allocate(candidate: InvoiceCandidate, mapping: LedgerMapping): ExpenseAllocation {
    // Stub for complex tax math and rounding
    return new ExpenseAllocation(crypto.randomUUID(), candidate.id, [], candidate.totalAmount);
  }
}

@Injectable()
export class VoucherGenerator {
  generate(allocation: ExpenseAllocation): any {
    // Generates VoucherCandidate for the ERP
    return {};
  }
}

// policies/index.ts
@Injectable()
export class ExpenseValidationPolicy {
  validate(candidate: InvoiceCandidate, match: VendorMatch): Result<boolean, string> {
    if (candidate.totalAmount.amount.toNumber() < 0) return fail('Amount cannot be negative');
    if (candidate.invoiceDate.date > new Date()) return fail('Invoice date cannot be in the future');
    return ok(true);
  }
}
