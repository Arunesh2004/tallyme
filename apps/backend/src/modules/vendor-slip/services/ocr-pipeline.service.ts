import { Injectable, NotFoundException, UnprocessableEntityException, Inject } from '@nestjs/common';
import { OCRCoordinator, InvoiceExtractor } from '../domain/services';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { CompanyContextService } from '../../../core/context/company-context.service';
import { DocumentReviewService } from './document-review.service';
import { DocumentClassificationService } from '../../document-processing/services/document-classification.service';
import { PurchaseCompatibilityAdapter } from '../application/purchase-compatibility.adapter';
import { ConfigService } from '@nestjs/config';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { AuditService } from '../../audit/audit.service';
import { CorrelationContext } from '../../../shared/observability/context';

@Injectable()
export class OcrPipelineService {
  constructor(
    private readonly ocrCoordinator: OCRCoordinator,
    private readonly aiExtractor: InvoiceExtractor,
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly companyContext: CompanyContextService,
    private readonly reviewService: DocumentReviewService,
    private readonly classificationService: DocumentClassificationService,
    private readonly purchaseAdapter: PurchaseCompatibilityAdapter,
    private readonly configService: ConfigService,
    private readonly transactionDraftService: TransactionDraftService,
    private readonly prometheus: PrometheusService,
    private readonly auditService: AuditService,
  ) {}

  async processDocument(fileId: string, correlationIdParam?: string) {
    const configValue = this.configService.get('USE_UNIVERSAL_INGESTION');
    const useUniversal = configValue === true || configValue === 'true' || process.env.USE_UNIVERSAL_INGESTION === 'true';

    // Metric recording
    this.prometheus.getCounter('tallyme_feature_flag_usage_total').inc({ state: useUniversal ? 'ON' : 'OFF' });

    // 1. Fetch the Document record to get the actual stored file path
    const document = await this.prisma.document.findUnique({
      where: { id: fileId },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${fileId}`);
    }

    // Extract correlationId or generate if missing
    let correlationId = correlationIdParam || CorrelationContext.getCorrelationId();
    if (!correlationId) {
      correlationId = crypto.randomUUID();
    }

    // Update document status to OCR_PROCESSING
    await this.prisma.document.update({
      where: { id: fileId },
      data: { status: 'OCR_PROCESSING' },
    });

    try {
      // Timer: File Loading
      const t0 = Date.now();
      const fileBuffer = await fs.readFile(document.fileUrl);
      const t1 = Date.now();

      // Timer: OCR
      const ocrResult = await this.ocrCoordinator.runOCR(fileBuffer, {
        mimeType: document.mimeType,
      });
      const t2 = Date.now();

      console.log(`[OCR PERF] File load: ${t1 - t0}ms, Gemini Total: ${t2 - t1}ms`);

      if (useUniversal) {
        return await this.executeUniversalPipeline(fileId, document, ocrResult, fileBuffer, correlationId, t1);
      } else {
        return await this.executeLegacyPipeline(fileId, document, ocrResult, fileBuffer);
      }
    } catch (error: any) {
      // Graceful degradation on OCR / AI extraction failure
      await this.prisma.document.update({
        where: { id: fileId },
        data: { status: 'OCR_FAILED' },
      });

      await this.prisma.vendorSlipAudit.create({
        data: {
          documentId: fileId,
          action: 'OCR_EXTRACTION_FAILURE',
          metadata: { error: error.message, stack: error.stack },
        },
      });

      throw new UnprocessableEntityException({
        status: 'FAILED',
        error: error.message,
      });
    }
  }

  private async executeLegacyPipeline(fileId: string, document: any, ocrResult: any, fileBuffer: Buffer) {
    // 3. Extract Invoice Fields (Legacy hardcoded purchase)
    const candidate = await this.aiExtractor.extract(
      ocrResult.text,
      fileBuffer,
      document.mimeType,
    );

    // 4. Persist InvoiceCandidate linked to the Document
    const createdCandidate = await this.prisma.invoiceCandidate.upsert({
      where: { documentId: document.id },
      update: {
        invoiceNumber: candidate.invoiceNumber ?? 'UNKNOWN',
        date: candidate.invoiceDate,
        total: candidate.amount || 0,
        subtotal: candidate.subtotal || null,
        tax:
          candidate.taxAmount ||
          (candidate.cgst || 0) +
            (candidate.sgst || 0) +
            (candidate.igst || 0) +
            (candidate.cess || 0),
        extractedGstin: candidate.gstin ?? null,
        extractedName: candidate.vendorName ?? null,
        extractedData: candidate as any,
        status: 'EXTRACTED',
      },
      create: {
        documentId: document.id,
        invoiceNumber: candidate.invoiceNumber ?? 'UNKNOWN',
        date: candidate.invoiceDate,
        total: candidate.amount || 0,
        subtotal: candidate.subtotal || null,
        tax:
          candidate.taxAmount ||
          (candidate.cgst || 0) +
            (candidate.sgst || 0) +
            (candidate.igst || 0) +
            (candidate.cess || 0),
        extractedGstin: candidate.gstin ?? null,
        extractedName: candidate.vendorName ?? null,
        extractedData: candidate as any,
        status: 'EXTRACTED',
      },
    });

    // Update document status
    await this.prisma.document.update({
      where: { id: fileId },
      data: {
        status: 'EXTRACTION_PROCESSING',
        confidenceScore: candidate.confidence ?? null,
      },
    });

    // 5. Check Confidence and Route
    const confidence = candidate.confidence ?? 0;
    if (confidence < 0.8) {
      await this.prisma.document.update({
        where: { id: fileId },
        data: { status: 'MANUAL_REVIEW' },
      });
      await this.reviewService.createReviewEntry(document.id, confidence, candidate);
    } else {
      // Dispatch to BullMQ vendor-slip-queue
      let companyId = 'UAT-TENANT-123';
      try {
        companyId = this.companyContext.getCompanyId();
      } catch (e) {
        console.warn('CompanyContext missing, using fallback', {
          fallback: companyId,
        });
      }

      await this.queueService.addJob(
        'vendor-slip-queue',
        'process-vendor-slip',
        {
          candidateId: createdCandidate.id,
          companyId: companyId,
        },
      );
    }

    return {
      status: 'SUCCESS',
      candidateId: createdCandidate.id,
      documentId: document.id,
      confidence: candidate.confidence ?? 0,
    };
  }

  private async executeUniversalPipeline(fileId: string, document: any, ocrResult: any, fileBuffer: Buffer, correlationId: string, ocrStartTime: number) {
    const t3 = Date.now();
    // Phase 1: Classification
    const classification = await this.classificationService.classify(ocrResult.text, fileBuffer, document.mimeType);
    const t4 = Date.now();
    
    // Update document with classification
    await this.prisma.document.update({
      where: { id: fileId },
      data: { 
        status: 'EXTRACTION_PROCESSING', 
        confidenceScore: classification.confidence
      },
    });

    if (classification.confidence < 0.8 || classification.documentType === 'Unknown') {
        this.prometheus.getCounter('tallyme_manual_review_rate_total').inc();
        await this.prisma.document.update({
          where: { id: fileId },
          data: { status: 'MANUAL_REVIEW' },
        });
        // We still need an entry for review service
        await this.reviewService.createReviewEntry(document.id, classification.confidence, { extractedData: 'Classification Failed' });
        return { status: 'MANUAL_REVIEW', documentId: fileId, confidence: classification.confidence };
    }

    // Phase 2: Canonical Extraction
    const canonicalModel = await (this.aiExtractor as any).aiExtractor.extractUniversalDocument(
        classification.documentType, 
        ocrResult.text, 
        fileBuffer, 
        document.mimeType
    );
    const t5 = Date.now();

    // Inject Correlation ID into metadata
    canonicalModel.metadata = canonicalModel.metadata || {};
    canonicalModel.metadata.correlationId = correlationId;

    // Audit Log: OCR Executed
    await this.auditService.log({
      action: 'OCR_EXECUTED',
      entity: 'Document',
      entityId: fileId,
      correlationId,
      newValue: {
        documentType: classification.documentType,
        confidence: classification.confidence,
        canonicalModel,
        perfTimers: {
          gemini: t3 - ocrStartTime,
          classification: t4 - t3,
          extraction: t5 - t4,
          totalOcr: t5 - ocrStartTime
        }
      },
      reason: 'Universal pipeline OCR extraction completed',
    });

    // Phase 3: Persist Transaction Draft
    let userId = 'system-ocr';
    const draft = await this.transactionDraftService.createDraft(canonicalModel, userId);

    // Phase 4 & 6: Dual Run & Compatibility Adapter for Purchase
    let finalCandidateId = draft.id;

    if (classification.documentType === 'Purchase' || classification.documentType === 'Expense') {
        
        // Generate legacy InvoiceCandidate via Compatibility Adapter
        const adapterOutput = this.purchaseAdapter.adapt(document.id, draft.id, canonicalModel);
        this.prometheus.getCounter('tallyme_compatibility_adapter_usage_total').inc();

        const createdCandidate = await this.prisma.invoiceCandidate.upsert({
          where: { documentId: document.id },
          update: adapterOutput as any,
          create: adapterOutput as any,
        });

        finalCandidateId = createdCandidate.id;

        // DUAL RUN: Execute legacy extraction to compare
        try {
           const legacyCandidate = await this.aiExtractor.extract(ocrResult.text, fileBuffer, document.mimeType);
           // Evaluate mismatch
           const isMatch = legacyCandidate.invoiceNumber === canonicalModel.header.invoiceNumber &&
                           legacyCandidate.amount === adapterOutput.total;
           
           if (isMatch) {
               this.prometheus.getCounter('tallyme_dual_run_success_total').inc();
           } else {
               this.prometheus.getCounter('tallyme_dual_run_mismatch_total').inc();
               console.warn(`[DUAL RUN MISMATCH] Doc ${fileId} - Legacy Total: ${legacyCandidate.amount} vs Universal: ${adapterOutput.total}`);
           }
        } catch (dualRunErr) {
           this.prometheus.getCounter('tallyme_dual_run_mismatch_total').inc();
           console.error('[DUAL RUN ERROR]', dualRunErr);
        }

        // Dispatch legacy queue
        let companyId = 'UAT-TENANT-123';
        try { companyId = this.companyContext.getCompanyId(); } catch (e) {}
        
        await this.queueService.addJob('vendor-slip-queue', 'process-vendor-slip', {
            candidateId: createdCandidate.id,
            companyId: companyId,
        });
    }

    return {
      status: 'SUCCESS',
      candidateId: finalCandidateId,
      documentId: document.id,
      confidence: classification.confidence,
    };
  }
}
