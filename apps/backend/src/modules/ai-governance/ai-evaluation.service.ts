import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AIEvaluationService {
  private readonly logger = new Logger(AIEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async evaluateDailyAccuracy() {
    this.logger.log('Starting daily AI accuracy evaluation');

    // Group execution logs by modelVersionId for the past day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await this.prisma.aIExecutionLog.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    const modelStats = new Map<string, { total: number; correct: number }>();

    for (const log of logs) {
      const stats = modelStats.get(log.modelVersionId) || {
        total: 0,
        correct: 0,
      };
      stats.total += 1;
      if (!log.humanCorrected) {
        stats.correct += 1;
      }
      modelStats.set(log.modelVersionId, stats);
    }

    for (const [modelVersionId, stats] of modelStats.entries()) {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
      await this.prisma.aIAccuracyMetric.create({
        data: {
          modelVersionId,
          metricType: 'DAILY_ACCURACY',
          totalPredictions: stats.total,
          correctPredictions: stats.correct,
          accuracy,
          period: 'DAILY',
        },
      });
      this.logger.log(
        `Evaluated model ${modelVersionId}: ${accuracy * 100}% accuracy over ${stats.total} predictions`,
      );
    }
  }
}
