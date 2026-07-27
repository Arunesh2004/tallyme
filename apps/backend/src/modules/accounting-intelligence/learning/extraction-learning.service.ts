import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ExtractionLearningService {
  private readonly logger = new Logger(ExtractionLearningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logCorrection(data: {
    documentId: string;
    fieldName: string;
    oldValue?: string;
    newValue?: string;
    reason?: string;
    correctedBy?: string;
  }) {
    this.logger.log(
      `Logging correction for doc ${data.documentId} field ${data.fieldName}`,
    );
    return this.prisma.extractionCorrectionLog.create({
      data: {
        documentId: data.documentId,
        fieldName: data.fieldName,
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason,
        correctedBy: data.correctedBy,
      },
    });
  }

  async analyzeRepeatedMistakes(timeframeDays: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframeDays);

    const logs = await this.prisma.extractionCorrectionLog.groupBy({
      by: ['fieldName'],
      _count: {
        fieldName: true,
      },
      where: {
        createdAt: { gte: cutoff },
      },
      orderBy: {
        _count: {
          fieldName: 'desc',
        },
      },
    });

    return logs.map((l) => ({
      fieldName: l.fieldName,
      mistakeCount: l._count.fieldName,
    }));
  }
}
