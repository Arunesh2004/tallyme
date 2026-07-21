// src/modules/vendor-slip/api/ocr.controller.ts
import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/guards/permissions.guard';
import { OCRCoordinator, InvoiceExtractor } from '../domain/services';
// Prisma and EventPublisher injected in reality

@Controller('ocr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OcrController {
  constructor(
    private readonly ocrCoordinator: OCRCoordinator,
    private readonly aiExtractor: InvoiceExtractor
  ) {}

  @Post('process/:fileId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Invoice.Process')
  async processInvoice(@Param('fileId') fileId: string) {
    // 1. Fetch file path from storage
    const documentPath = `/storage/invoices/stub/${fileId}`;
    
    // 2. OCR (Vision)
    const rawText = await this.ocrCoordinator.runOCR(documentPath);
    
    // 3. Extract (Gemini)
    const candidate = await this.aiExtractor.extract(rawText);

    // 4. Persist Candidate & Publish Events (Stubbed for controller slice)
    // await this.prisma.invoiceCandidate.create({ ... })
    // await this.eventPublisher.publish(new OCRCompleted(...))
    
    return {
      status: 'SUCCESS',
      candidateId: candidate.id,
      confidence: candidate.confidence.score
    };
  }

  @Get(':fileId/status')
  @RequirePermissions('Invoice.Read')
  async getStatus(@Param('fileId') fileId: string) {
    return { fileId, status: 'EXTRACTED' }; // Stub
  }
}
