import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OcrPipelineService } from '../services/ocr-pipeline.service';
import { EnterpriseEventGateway } from '../../events/enterprise-event.gateway';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Processor('ocr-queue')
export class OcrWorker extends WorkerHost {
  private readonly logger = new Logger(OcrWorker.name);

  constructor(
    private readonly ocrPipelineService: OcrPipelineService,
    private readonly eventGateway: EnterpriseEventGateway,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { fileId, correlationId } = job.data;
    this.logger.log(`Processing OCR job ${job.id} for file ${fileId}`);
    
    this.eventGateway.emitEvent(`${fileId}:ocr_status`, {
        status: 'OCR_STARTED',
        documentId: fileId,
        jobId: job.id,
        timestamp: new Date().toISOString()
    });

    try {
        const result = await this.ocrPipelineService.processDocument(fileId, correlationId);
        
        this.eventGateway.emitEvent(`${fileId}:ocr_status`, {
            status: 'OCR_COMPLETED',
            documentId: fileId,
            jobId: job.id,
            result,
            timestamp: new Date().toISOString()
        });

        return result;
    } catch (error: any) {
        this.logger.error(`OCR job ${job.id} failed: ${error.message}`);
        throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    const { fileId } = job.data;
    
    // Check if job will be retried
    if (job.attemptsMade < (job.opts.attempts || 1)) {
        this.logger.warn(`OCR job ${job.id} failed temporarily. Emitting OCR_RETRYING.`);
        this.eventGateway.emitEvent(`${fileId}:ocr_status`, {
            status: 'OCR_RETRYING',
            documentId: fileId,
            jobId: job.id,
            attempt: job.attemptsMade,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } else {
        this.logger.error(`OCR job ${job.id} failed permanently. Emitting OCR_FAILED.`);
        this.eventGateway.emitEvent(`${fileId}:ocr_status`, {
            status: 'OCR_FAILED',
            documentId: fileId,
            jobId: job.id,
            error: error.message,
            timestamp: new Date().toISOString()
        });

        // Ensure database reflects failed state
        await this.prisma.document.update({
            where: { id: fileId },
            data: { status: 'OCR_FAILED' },
        }).catch(err => this.logger.error(`Failed to update document status: ${err.message}`));
    }
  }
}
