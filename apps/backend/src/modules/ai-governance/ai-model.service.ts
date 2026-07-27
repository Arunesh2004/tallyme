import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AIModelService {
  private readonly logger = new Logger(AIModelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveModel(purpose: string) {
    return this.prisma.aIModelVersion.findFirst({
      where: { purpose, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logExecution(data: {
    modelVersionId: string;
    entityType: string;
    entityId: string;
    inputHash: string;
    outputHash: string;
    confidence: number;
    latency: number;
  }) {
    return this.prisma.aIExecutionLog.create({
      data,
    });
  }
}
