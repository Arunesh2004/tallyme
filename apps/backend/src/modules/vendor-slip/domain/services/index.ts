// services/index.ts
import { Injectable, Inject } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import {
  InvoiceCandidate,
  VendorMatch,
  ExpenseAllocation,
  LedgerMapping,
} from '../entities';
import {
  IVendorRepository,
  IVendorLedgerProfileRepository,
} from '../../interfaces/vendor.repository.interface';
import { InvoiceAmount } from '../value-objects';

import { OCRProvider, OCRResult } from '../../../document-processing/providers/ocr-provider.interface';
import { AIExtractor, InvoiceExtractionResult } from '../../../document-processing/providers/ai-extractor.interface';

@Injectable()
export class OCRCoordinator {
  constructor(
    @Inject('OCRProvider') private readonly ocrProvider: OCRProvider,
  ) {}
  async runOCR(documentBuffer: Buffer, metadata?: Record<string, any>): Promise<OCRResult> {
    return this.ocrProvider.extractText(documentBuffer, metadata);
  }
}

@Injectable()
export class InvoiceExtractor {
  constructor(
    @Inject('AIExtractor') private readonly aiExtractor: AIExtractor,
  ) {}
  async extract(rawText: string): Promise<InvoiceExtractionResult> {
    return this.aiExtractor.extractInvoiceFields(rawText);
  }
}

@Injectable()
export class VendorMatcher {
  constructor(
    @Inject('IVendorRepository') private readonly vendorRepo: IVendorRepository,
  ) {}
  async match(
    candidate: InvoiceCandidate,
  ): Promise<Result<VendorMatch, string>> {
    const gstin = candidate.extractedGstin?.value;
    const vendor = gstin ? await this.vendorRepo.findByGSTIN(gstin) : null;
    if (!vendor)
      return fail('Vendor not found for given GSTIN. Manual review required.');

    // (implementation note)
    return ok(
      new VendorMatch(
        crypto.randomUUID(),
        candidate.id,
        vendor.id,
        candidate.confidence,
      ),
    );
  }
}

@Injectable()
export class LedgerMapper {
  constructor(
    @Inject('IVendorLedgerProfileRepository')
    private readonly ledgerProfileRepo: IVendorLedgerProfileRepository,
  ) {}
  async map(match: VendorMatch): Promise<LedgerMapping | null> {
    return this.ledgerProfileRepo.findByVendorId(match.vendorId);
  }
}

@Injectable()
export class ExpenseAllocator {
  allocate(
    candidate: InvoiceCandidate,
    mapping: LedgerMapping,
    expenseLedgerName: string,
    gstLedgerName?: string,
  ): ExpenseAllocation {
    const total =
      candidate.totalAmount && candidate.totalAmount.value
        ? candidate.totalAmount.value.toNumber()
        : 0;
    const subtotal =
      candidate.extractedSubtotal && candidate.extractedSubtotal.value
        ? candidate.extractedSubtotal.value.toNumber()
        : 0;
    const tax =
      candidate.extractedTax && candidate.extractedTax.value
        ? candidate.extractedTax.value.toNumber()
        : 0;

    const lineItems: any[] = [];
    
    // Allocate subtotal
    if (subtotal > 0) {
      lineItems.push({
        ledger: expenseLedgerName,
        amount: subtotal,
      });
    } else if (total > 0 && tax > 0) {
      lineItems.push({
        ledger: expenseLedgerName,
        amount: total - tax,
      });
    } else if (total > 0) {
      lineItems.push({
        ledger: expenseLedgerName,
        amount: total,
      });
    }

    // Allocate tax
    if (tax > 0 && gstLedgerName) {
      lineItems.push({
        ledger: gstLedgerName,
        amount: tax,
      });
    }

    return new ExpenseAllocation(
      crypto.randomUUID(),
      candidate.id,
      lineItems,
      candidate.totalAmount || new InvoiceAmount(total, 0, ''),
    );
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
  validate(
    candidate: InvoiceCandidate,
    match?: VendorMatch, // Made optional for pure extraction validation
  ): Result<boolean, string> {
    if (candidate.confidence && candidate.confidence.score < 70) {
      return fail('Overall confidence is below 70%');
    }

    if (!candidate.totalAmount || !candidate.totalAmount.value) {
      return fail('Total amount is missing');
    }

    if (candidate.totalAmount.value.toNumber() < 0) {
      return fail('Amount cannot be negative');
    }

    if (!candidate.invoiceDate || !candidate.invoiceDate.value) {
      return fail('Invoice date is missing');
    }

    if (candidate.invoiceDate.value > new Date('2030-01-01')) {
      return fail('Invoice date cannot be in the future');
    }

    // Check individual field confidences if applicable
    const fields = [
      candidate.extractedVendorName,
      candidate.invoiceNumber,
      candidate.invoiceDate,
      candidate.extractedSubtotal,
      candidate.extractedTax,
      candidate.totalAmount,
      candidate.extractedGstin,
    ];

    for (const field of fields) {
      if (field && field.confidence < 70) {
        return fail('One or more extracted fields have very low confidence (< 70%)');
      }
    }

    return ok(true);
  }
}
