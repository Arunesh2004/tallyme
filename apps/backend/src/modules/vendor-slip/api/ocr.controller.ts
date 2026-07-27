// src/modules/vendor-slip/api/ocr.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';
import { OCRCoordinator, InvoiceExtractor } from '../domain/services';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';
import * as fs from 'fs/promises';
import { CompanyContextService } from '../../../core/context/company-context.service';

/**
 * OcrController — protected by JWT authentication.
 * All endpoints require a valid Bearer token; specific endpoints
 * additionally require fine-grained permissions.
 */
@Controller('ocr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OcrController {
  constructor(
    private readonly ocrCoordinator: OCRCoordinator,
    private readonly aiExtractor: InvoiceExtractor,
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly companyContext: CompanyContextService,
  ) {}

  /**
   * POST /ocr/process/:fileId
   * Triggers OCR → AI Extraction → persist InvoiceCandidate → BullMQ dispatch.
   * Fetches the real file path from the Document record stored during upload.
   */
  @Post('process/:fileId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Invoice.Process')
  async processInvoice(@Param('fileId') fileId: string) {
    // 1. Fetch the Document record to get the actual stored file path
    const document = await this.prisma.document.findUnique({
      where: { id: fileId },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${fileId}`);
    }

    // Update document status to OCR_PROCESSING
    await this.prisma.document.update({
      where: { id: fileId },
      data: { status: 'OCR_PROCESSING' },
    });

    try {
      // 2. Run OCR against the stored file path
      const fileBuffer = await fs.readFile(document.fileUrl);
      const ocrResult = await this.ocrCoordinator.runOCR(fileBuffer, { mimeType: document.mimeType });

      // 3. Extract Invoice Fields
      const candidate = await this.aiExtractor.extract(ocrResult.text);

      // 4. Persist InvoiceCandidate linked to the Document
      const createdCandidate = await this.prisma.invoiceCandidate.create({
        data: {
          documentId: document.id,
          invoiceNumber: candidate.invoiceNumber ?? 'UNKNOWN',
          date: candidate.invoiceDate,
          total: candidate.amount || 0,
          tax: candidate.taxAmount || 0,
          extractedGstin: candidate.gstin ?? null,
          extractedName: candidate.vendorName ?? null,
          extractedData: {
            lineItems: candidate.lineItems,
            confidence: candidate.confidence,
            confidenceFactors: candidate.confidenceFactors
          },
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

      // 5. Dispatch to BullMQ vendor-slip-queue
      await this.queueService.addJob('vendor-slip-queue', 'process-vendor-slip', {
        candidateId: createdCandidate.id,
        companyId: this.companyContext.getCompanyId(),
      });

      return {
        status: 'SUCCESS',
        candidateId: createdCandidate.id,
        documentId: document.id,
        confidence: candidate.confidence ?? 0,
      };
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

  /**
   * GET /ocr/:fileId/status
   * Returns the current processing status of a document.
   */
  @Get(':fileId/status')
  @RequirePermissions('Invoice.Read')
  async getStatus(@Param('fileId') fileId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: fileId },
      include: { invoiceCandidate: true },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${fileId}`);
    }

    return {
      fileId,
      documentStatus: document.status,
      candidateId: document.invoiceCandidate?.id ?? null,
      candidateStatus: document.invoiceCandidate?.status ?? null,
    };
  }
}
