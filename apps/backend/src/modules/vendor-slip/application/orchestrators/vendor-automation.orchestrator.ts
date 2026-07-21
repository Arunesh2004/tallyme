import { Injectable } from '@nestjs/common';
import { PrismaVendorAutomationRepository } from '../../infrastructure/repositories/prisma-vendor-automation.repository';
import { IOCRProvider } from '../../domain/providers/ocr.provider';
import { IInvoiceExtractionProvider } from '../../domain/providers/extraction.provider';
import {
  VoucherBuilder,
  VoucherCandidate as DomainVoucherCandidate,
} from '../../domain/services/voucher.service';
import { ExpenseAllocation as DomainExpenseAllocation } from '../../domain/entities';
import { InvoiceAmount } from '../../domain/value-objects';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class VendorAutomationOrchestrator {
  constructor(
    private readonly repository: PrismaVendorAutomationRepository,
    private readonly ocrProvider: IOCRProvider,
    private readonly extractionProvider: IInvoiceExtractionProvider,
    private readonly voucherBuilder: VoucherBuilder,
    private readonly prisma: PrismaService, // Needed for ERPSyncJob creation
  ) {}

  async handleDocumentUpload(
    fileUrl: string,
    mimeType: string,
    uploadedBy: string,
    source: string,
  ): Promise<string> {
    const document = await this.repository.createDocument({
      fileUrl,
      checksum: 'dummy-checksum-' + Date.now(), // Simulated checksum
      mimeType,
      uploadedBy,
      source,
      status: 'UPLOADED',
    });

    await this.repository.logAudit(document.id, 'DOCUMENT_UPLOADED', {
      fileUrl,
      source,
    });

    // In a real system, we would enqueue a job here.
    // For integration testing, we can simulate the saga directly by calling the next method.
    return document.id;
  }

  async processOCR(documentId: string): Promise<void> {
    const doc = await this.repository.getDocument(documentId);
    if (!doc) return;

    await this.repository.updateDocumentStatus(documentId, 'OCR_PROCESSING');
    await this.repository.logAudit(documentId, 'OCR_STARTED');

    try {
      const { text, confidence } = await this.ocrProvider.processDocument(
        doc.fileUrl,
        doc.mimeType,
      );

      if (confidence < 0.7) {
        await this.repository.routeToManualReview(
          documentId,
          'Low OCR Confidence: ' + confidence,
        );
        await this.repository.logAudit(documentId, 'ROUTED_TO_MANUAL_REVIEW', {
          reason: 'OCR_LOW_CONFIDENCE',
          confidence,
        });
        return;
      }

      await this.repository.updateDocumentStatus(
        documentId,
        'EXTRACTION_PROCESSING',
        confidence,
      );
      await this.repository.logAudit(documentId, 'OCR_COMPLETED', {
        confidence,
      });

      // Proceed to Extraction
      await this.processExtraction(documentId, text);
    } catch (e: any) {
      await this.repository.updateDocumentStatus(documentId, 'OCR_FAILED');
      await this.repository.routeToManualReview(
        documentId,
        'OCR processing failed: ' + e.message,
      );
      await this.repository.logAudit(documentId, 'OCR_FAILED', {
        error: e.message,
      });
    }
  }

  async processExtraction(documentId: string, ocrText: string): Promise<void> {
    try {
      const data = await this.extractionProvider.extractInvoiceData(ocrText);

      if (data.confidence < 0.8) {
        await this.repository.routeToManualReview(
          documentId,
          'Low Extraction Confidence: ' + data.confidence,
        );
        await this.repository.logAudit(documentId, 'ROUTED_TO_MANUAL_REVIEW', {
          reason: 'EXTRACTION_LOW_CONFIDENCE',
          confidence: data.confidence,
        });
        return;
      }

      await this.repository.createInvoiceCandidate({
        documentId,
        invoiceNumber: data.invoiceNumber,
        date: data.date,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        extractedGstin: data.extractedGstin,
        extractedPan: data.extractedPan,
        extractedName: data.extractedName,
      });

      await this.repository.updateDocumentStatus(documentId, 'VENDOR_MATCHING');
      await this.repository.logAudit(documentId, 'EXTRACTION_COMPLETED');

      // Proceed to Vendor Match
      await this.processVendorMatch(
        documentId,
        data.extractedGstin || '',
        data.extractedPan || '',
      );
    } catch (e: any) {
      await this.repository.updateDocumentStatus(
        documentId,
        'EXTRACTION_FAILED',
      );
      await this.repository.routeToManualReview(
        documentId,
        'AI extraction failed: ' + e.message,
      );
      await this.repository.logAudit(documentId, 'EXTRACTION_FAILED', {
        error: e.message,
      });
    }
  }

  async processVendorMatch(
    documentId: string,
    gstin: string,
    pan: string,
  ): Promise<void> {
    const vendor = await this.repository.findVendorByGstinOrPan(gstin, pan);

    if (!vendor) {
      await this.repository.updateDocumentStatus(
        documentId,
        'VENDOR_UNMATCHED',
      );
      await this.repository.routeToManualReview(
        documentId,
        'Vendor not found for given GSTIN/PAN',
      );
      await this.repository.logAudit(documentId, 'ROUTED_TO_MANUAL_REVIEW', {
        reason: 'VENDOR_NOT_FOUND',
        gstin,
        pan,
      });
      return;
    }

    await this.repository.createVendorMatch({
      documentId,
      vendorId: vendor.id,
      confidence: 1.0,
    });

    await this.repository.updateDocumentStatus(
      documentId,
      'EXPENSE_ALLOCATING',
    );
    await this.repository.logAudit(documentId, 'VENDOR_MATCHED', {
      vendorId: vendor.id,
    });

    // Proceed to Expense Allocation
    await this.processExpenseAllocation(documentId);
  }

  async processExpenseAllocation(documentId: string): Promise<void> {
    // In a real scenario, this would apply vendor-specific rules to generate line items.
    // We simulate default expense allocation for testing.

    const candidate = await this.prisma.invoiceCandidate.findUnique({
      where: { documentId },
    });
    if (!candidate) return;

    const total = candidate.total ? candidate.total.toNumber() : 0;

    await this.repository.createExpenseAllocation({
      documentId,
      totalAllocated: total,
      lineItems: [{ ledgerName: 'Purchases', amount: total }],
    });

    await this.repository.updateDocumentStatus(documentId, 'VOUCHER_GENERATED');
    await this.repository.logAudit(documentId, 'EXPENSE_ALLOCATED', { total });

    // Proceed to Voucher Generation
    await this.processVoucherGeneration(documentId);
  }

  async processVoucherGeneration(documentId: string): Promise<void> {
    const allocation = await this.prisma.expenseAllocation.findUnique({
      where: { documentId },
      include: {
        lineItems: true,
        document: { include: { vendorMatch: true, invoiceCandidate: true } },
      },
    });

    if (!allocation) return;

    // Domain entity conversion
    const domainAllocation = new DomainExpenseAllocation(
      allocation.id,
      allocation.document.vendorMatch?.vendorId || '',
      allocation.lineItems.map((li) => ({
        ledger: li.ledgerName,
        amount: new DecimalWrapper(li.amount.toNumber()),
        isTax: false,
      })),
      new InvoiceAmount(allocation.totalAllocated.toNumber()) as any,
    );
    // Note: We cast InvoiceAmount as any because VoucherBuilder expects it to behave like IDecimal directly (due to incomplete stubbing in earlier phases).
    // Let's actually patch domainAllocation to have .toNumber() on the InvoiceAmount if it's passed directly to VoucherEntry.
    (domainAllocation.totalAllocated as any).toNumber = () =>
      (domainAllocation.totalAllocated as InvoiceAmount).amount.toNumber();

    const vendorLedgerName =
      allocation.document.invoiceCandidate?.extractedName || 'Vendor Ledger';
    const result = this.voucherBuilder.build(
      domainAllocation,
      vendorLedgerName,
    );

    if (result.isFailure) {
      await this.repository.routeToManualReview(
        documentId,
        'Voucher validation failed: ' + result.error,
      );
      await this.repository.logAudit(documentId, 'ROUTED_TO_MANUAL_REVIEW', {
        reason: 'VOUCHER_VALIDATION_FAILED',
        error: result.error,
      });
      return;
    }

    const domainCandidate = result.value;

    // The Shared Accounting Engine generated the voucher candidate.
    // Now we store it in the Prisma model and queue ERPSyncJob.
    const company = await this.prisma.company.findFirst(); // Assumes at least one company exists
    if (!company) {
      throw new Error('No company found to associate with voucher');
    }

    const savedCandidate = await this.prisma.voucherCandidate.create({
      data: {
        companyId: company.id,
        voucherNumber: 'VCH-' + Date.now(),
        voucherType: 'Purchase',
        date: domainCandidate.date,
        narration: domainCandidate.narration,
        partyLedgerName: vendorLedgerName,
        isEdit: false,
        status: 'PENDING',
        entries: {
          create: domainCandidate.entries.map((entry: any, index: number) => ({
            sequence: index + 1,
            ledgerName: entry.ledgerName,
            amount: entry.amount.toNumber(),
            isDebit: entry.isDebit,
            isParty: !entry.isDebit, // Credit side is party in this mock
          })),
        },
      },
    });

    // Enqueue to ERP Connector by creating an ERPSyncJob
    await this.prisma.eRPSyncJob.create({
      data: {
        voucherCandidateId: savedCandidate.id,
        adapterCode: 'TALLY_PRIME_V1',
        idempotencyHash: 'hash-' + savedCandidate.id,
      },
    });

    await this.repository.updateDocumentStatus(documentId, 'ERP_SYNCING');
    await this.repository.logAudit(documentId, 'VOUCHER_GENERATED', {
      voucherId: savedCandidate.id,
    });
    await this.repository.logAudit(documentId, 'ERP_SYNC_QUEUED');
  }
}
