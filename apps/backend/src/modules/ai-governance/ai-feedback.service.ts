import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AIFeedbackService {
  private readonly logger = new Logger(AIFeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async markHumanCorrection(executionLogId: string) {
    this.logger.log(
      `Marking execution log ${executionLogId} as human corrected`,
    );
    return this.prisma.aIExecutionLog.update({
      where: { id: executionLogId },
      data: { humanCorrected: true },
    });
  }
}
