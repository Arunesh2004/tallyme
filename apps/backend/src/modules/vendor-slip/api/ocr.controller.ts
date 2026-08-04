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
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CorrelationContext } from '../../../shared/observability/context';
import { OcrPipelineService } from '../services/ocr-pipeline.service';
import { EnterpriseEventGateway } from '../../events/enterprise-event.gateway';

/**
 * OcrController — protected by JWT authentication.
 * All endpoints require a valid Bearer token; specific endpoints
 * additionally require fine-grained permissions.
 */
@Controller('ocr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OcrController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly configService: ConfigService,
    private readonly ocrPipelineService: OcrPipelineService,
    private readonly eventGateway: EnterpriseEventGateway,
  ) {}

  /**
   * POST /ocr/process/:fileId
   * Triggers OCR → AI Extraction → persist InvoiceCandidate → BullMQ dispatch.
   * If USE_ASYNC_OCR is true, enqueues the job and returns 202 Accepted.
   */
  @Post('process/:fileId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Invoice.Process')
  async processInvoice(@Param('fileId') fileId: string) {
    const isAsync = this.configService.get('USE_ASYNC_OCR') === 'true' || process.env.USE_ASYNC_OCR === 'true';

    // 1. Fetch the Document record to get the actual stored file path
    const document = await this.prisma.document.findUnique({
      where: { id: fileId },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${fileId}`);
    }

    // Extract correlationId or generate if missing
    let correlationId = CorrelationContext.getCorrelationId();
    if (!correlationId) {
      correlationId = crypto.randomUUID();
    }

    if (isAsync) {
      const jobId = crypto.randomUUID();
      await this.queueService.addJob(
        'ocr-queue',
        'process-ocr',
        {
          fileId,
          correlationId,
        },
        { jobId, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );
      
      this.eventGateway.emitEvent(`${fileId}:ocr_status`, {
        status: 'OCR_QUEUED',
        documentId: fileId,
        jobId,
        timestamp: new Date().toISOString()
      });

      return {
        status: 'ACCEPTED',
        documentId: fileId,
        jobId
      };
    } else {
      // Synchronous execution
      return await this.ocrPipelineService.processDocument(fileId, correlationId);
    }
  }

  /**
   * GET /ocr/:fileId/candidate
   * Returns the full InvoiceCandidate for a processed document.
   */
  @Get(':fileId/candidate')
  @RequirePermissions('Invoice.Read')
  async getCandidate(@Param('fileId') fileId: string) {
    const candidate = await this.prisma.invoiceCandidate.findUnique({
      where: { documentId: fileId },
      include: { document: true },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Candidate not found for document: ${fileId}`,
      );
    }

    return candidate;
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
