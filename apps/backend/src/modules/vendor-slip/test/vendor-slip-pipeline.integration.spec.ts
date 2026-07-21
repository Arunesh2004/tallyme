import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../core/logger/logger.service';
import { VendorAutomationOrchestrator } from '../application/orchestrators/vendor-automation.orchestrator';
import { PrismaVendorAutomationRepository } from '../infrastructure/repositories/prisma-vendor-automation.repository';
import { FakeVendorAutomationRepository } from './fake-vendor-automation.repository';
import { FakeOCRProvider } from '../infrastructure/providers/fake-ocr.provider';
import { FakeInvoiceExtractionProvider } from '../infrastructure/providers/fake-extraction.provider';
import {
  VoucherBuilder,
  VoucherValidator,
} from '../domain/services/voucher.service';

describe('Vendor Slip Automation Pipeline Integration', () => {
  let orchestrator: VendorAutomationOrchestrator;
  let prisma: PrismaService;

  beforeAll(async () => {
    const mockPrismaService = {
      company: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'comp-1',
          name: 'Integration Test Company',
        }),
      },
      vendor: { create: jest.fn(), deleteMany: jest.fn() },
      eRPSyncJob: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
      },
      voucherCandidate: {
        create: jest.fn().mockResolvedValue({ id: 'vc-1' }),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
      },
      document: { findUnique: jest.fn(), deleteMany: jest.fn() },
      manualReviewRoute: { findFirst: jest.fn() },
      vendorSlipAudit: { findMany: jest.fn() },
      invoiceCandidate: {
        findUnique: jest.fn().mockResolvedValue({
          documentId: 'doc-1',
          total: { toNumber: () => 100 },
        }),
      },
      expenseAllocation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ea-1',
          totalAllocated: { toNumber: () => 100 },
          document: {
            vendorMatch: { vendorId: 'v1' },
            invoiceCandidate: { extractedName: 'Acme Corp' },
          },
          lineItems: [
            { ledgerName: 'Purchases', amount: { toNumber: () => 100 } },
          ],
        }),
      },
    } as any;

    prisma = mockPrismaService;

    const repo = new FakeVendorAutomationRepository();
    const ocr = new FakeOCRProvider();
    const ext = new FakeInvoiceExtractionProvider();
    const validator = new VoucherValidator();
    const builder = new VoucherBuilder(validator);

    orchestrator = new VendorAutomationOrchestrator(
      repo as any,
      ocr,
      ext,
      builder,
      prisma,
    );
  });

  it('should successfully traverse the entire pipeline and enqueue an ERPSyncJob', async () => {
    // 1. Upload
    const docId = await orchestrator.handleDocumentUpload(
      's3://invoices/1.pdf',
      'application/pdf',
      'user1',
      'web',
    );

    // 2. OCR
    await orchestrator.processOCR(docId);
    const doc = await (orchestrator as any).repository.getDocument(docId);
    expect(doc?.status).toBe('ERP_SYNCING');

    // Verify ERP Sync Job was queued in Prisma
    expect(prisma.eRPSyncJob.create).toHaveBeenCalled();
    expect(prisma.voucherCandidate.create).toHaveBeenCalled();

    const audits = (orchestrator as any).repository.audits.filter(
      (a: any) => a.documentId === docId,
    );
    expect(audits.length).toBeGreaterThan(0);
  });

  it('should route to manual review on OCR failure', async () => {
    const docId = await orchestrator.handleDocumentUpload(
      'fail_ocr',
      'application/pdf',
      'user1',
      'web',
    );
    await orchestrator.processOCR(docId);

    const doc = await (orchestrator as any).repository.getDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');

    const review = await (orchestrator as any).repository.getReview(docId);
    expect(review?.reason).toContain('OCR processing failed');
  });

  it('should route to manual review on low OCR confidence', async () => {
    const docId = await orchestrator.handleDocumentUpload(
      'low_confidence',
      'application/pdf',
      'user1',
      'web',
    );
    await orchestrator.processOCR(docId);

    const doc = await (orchestrator as any).repository.getDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');
  });

  it('should route to manual review on missing vendor mapping', async () => {
    const docId = await orchestrator.handleDocumentUpload(
      's3://invoices/2.pdf',
      'application/pdf',
      'user1',
      'web',
    );

    await orchestrator.processExtraction(docId, 'MISSING_VENDOR');

    const doc = await (orchestrator as any).repository.getDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');

    const review = await (orchestrator as any).repository.getReview(docId);
    expect(review?.reason).toContain('Vendor not found');
  });
});
