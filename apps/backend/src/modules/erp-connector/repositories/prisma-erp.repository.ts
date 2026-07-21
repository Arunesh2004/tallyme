import { Injectable } from '@nestjs/common';
import { IERPRepository } from '../interfaces/erp.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaERPRepository implements IERPRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSyncJob(data: any): Promise<any> {
    return this.prisma.eRPSyncJob.create({
      data,
    });
  }

  async findConnectionByAdapter(adapterCode: string): Promise<any> {
    return this.prisma.eRPConnection.findFirst({
      where: { adapter: { code: adapterCode }, isActive: true },
      include: { adapter: true },
    });
  }

  async logAttempt(attempt: any): Promise<void> {
    await this.prisma.eRPSyncAttempt.create({
      data: attempt,
    });
  }

  async updateJobStatus(
    jobId: string,
    status: any,
    result?: any,
  ): Promise<void> {
    await this.prisma.eRPSyncJob.update({
      where: { id: jobId },
      data: {
        status,
        ...(result && {
          result: {
            create: {
              status,
              erpReferenceId: result.erpReferenceId,
            },
          },
        }),
      },
    });
  }

  async logSyncEvent(log: any): Promise<void> {
    await this.prisma.eRPSyncLog.create({
      data: log,
    });
  }
}
