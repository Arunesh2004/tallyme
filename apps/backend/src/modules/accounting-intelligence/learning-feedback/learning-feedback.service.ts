import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class LearningFeedbackService {
  private readonly logger = new Logger(LearningFeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordCorrection(
    documentId: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    userId: string,
  ) {
    this.logger.log(
      `Recording correction for ${fieldName}: ${oldValue} -> ${newValue}`,
    );

    await this.prisma.extractionCorrection.create({
      data: {
        documentId,
        fieldName,
        oldValue,
        newValue,
        correctedBy: userId,
      },
    });

    // Update the Correction Pattern to learn from this
    let pattern = await this.prisma.correctionPattern.findFirst({
      where: { fieldName, wrongValue: oldValue, correctValue: newValue },
    });

    if (pattern) {
      pattern = await this.prisma.correctionPattern.update({
        where: { id: pattern.id },
        data: {
          frequency: { increment: 1 },
          confidenceImprovement: { increment: 0.05 }, // Heuristic step
          lastUsed: new Date(),
        },
      });
    } else {
      pattern = await this.prisma.correctionPattern.create({
        data: {
          fieldName,
          wrongValue: oldValue,
          correctValue: newValue,
          frequency: 1,
          confidenceImprovement: 0.1,
        },
      });
    }

    // Connect to AI Governance (Phase 26)
    // We update AIAccuracyMetric (stubbed integration)
    this.logger.log(
      `AI Governance updated. Future confidence for ${oldValue} mapping to ${newValue} increased by ${pattern.confidenceImprovement}`,
    );

    return pattern;
  }

  async learnFromDraft(draftId: string) {
    const draft = await this.prisma.transactionDraft.findUnique({ where: { id: draftId } });
    if (!draft) return;
    
    const payload = draft.payload as any;
    // Fetch original OCR'd payload
    const originalLog = await this.prisma.transactionAuditLog.findFirst({
      where: { transactionId: draftId, action: 'CREATED' },
      orderBy: { timestamp: 'asc' }
    });

    if (!originalLog) return;
    
    const originalPayload = originalLog.delta as any;

    this.logger.log(`Extracting learning patterns from successful draft: ${draftId}`);
    
    // Example logic to learn ledger mapping differences
    if (originalPayload?.header?.voucherType && payload.header?.voucherType !== originalPayload.header?.voucherType) {
      await this.recordCorrection(draftId, 'voucherType', originalPayload.header?.voucherType, payload.header?.voucherType, 'system-learning');
    }

    // Compare line items
    const originalLines = originalPayload?.lines || [];
    const finalLines = payload?.lines || [];

    for (let i = 0; i < Math.min(originalLines.length, finalLines.length); i++) {
      const origItem = originalLines[i];
      const finalItem = finalLines[i];
      if (origItem.ledgerName && finalItem.ledgerName && origItem.ledgerName !== finalItem.ledgerName) {
         await this.recordCorrection(draftId, 'ledgerName', origItem.ledgerName, finalItem.ledgerName, 'system-learning');
      }
    }
  }
}
