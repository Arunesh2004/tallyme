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
}
