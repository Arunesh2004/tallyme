import { Injectable } from '@nestjs/common';
import { IERPRepository } from '../interfaces/erp.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ERPSyncStatus } from '@prisma/client';

@Injectable()
export class PrismaERPRepository implements IERPRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSyncJob(data: any): Promise<any> {
    // Inject adapterCode and idempotencyHash directly
    return this.prisma.eRPSyncJob.create({
      data: {
        voucherCandidateId: data.voucherCandidateId,
        status: data.status,
        adapterCode: data.adapterCode,
        idempotencyHash: data.idempotencyHash,
      },
    });
  }

  async findConnectionByAdapter(adapterCode: string): Promise<any> {
    // Connection model removed; simply return the adapter identity for orchestration
    return { adapterCode, isActive: true };
  }

  async logAttempt(attempt: any): Promise<void> {
    await this.prisma.eRPSyncAttempt.create({
      data: attempt,
    });
  }

  async findJobById(jobId: string): Promise<any> {
    return this.prisma.eRPSyncJob.findUnique({
      where: { id: jobId },
    });
  }

  async updateJobStatus(
    jobId: string,
    status: any,
    result?: any,
  ): Promise<void> {
    const data: any = {
      status,
      lastError: result?.lastError || null,
      erpReferenceId: result?.erpReferenceId || undefined,
    };

    if (result?.incrementAttempt) {
      data.attempts = { increment: 1 };
      data.lastAttemptAt = new Date();
    }

    if (result?.incrementVerification) {
      data.verificationAttempts = { increment: 1 };
      data.lastVerificationAt = new Date();
    }

    // ─── Audit Field Persistence (BLOCKER-1 Fix) ──────────────────────────────
    // Persist all ERP sync audit fields whenever they are provided.
    // These must be set on both SUCCESS and FAILURE paths.
    if (result?.requestXml !== undefined) data.requestXml = result.requestXml;
    if (result?.responseXml !== undefined) data.responseXml = result.responseXml;
    if (result?.xmlHash !== undefined) data.xmlHash = result.xmlHash;
    if (result?.responseTimeMs !== undefined) data.responseTimeMs = result.responseTimeMs;
    if (result?.transportStatus !== undefined) data.transportStatus = result.transportStatus;
    if (result?.voucherNumber !== undefined) data.voucherNumber = result.voucherNumber;
    if (result?.masterId !== undefined) data.masterId = result.masterId;
    if (result?.guid !== undefined) data.guid = result.guid;
    if (result?.lastResponse !== undefined) data.lastResponse = result.lastResponse;
    if (result?.parserWarnings !== undefined) data.parserWarnings = result.parserWarnings;
    if (result?.retryCount !== undefined) data.retryCount = result.retryCount;
    // ─────────────────────────────────────────────────────────────────────────

    // Implement Conditional Update to prevent concurrent mutations
    const resultQuery = await this.prisma.eRPSyncJob.updateMany({
      where: {
        id: jobId,
        // Only condition if statusFrom is provided; otherwise unconditional fallback
        ...(result?.statusFrom ? { status: result.statusFrom } : {}),
      },
      data,
    });

    if (resultQuery.count === 0 && result?.statusFrom) {
      // It means another worker transitioned the state in the meantime
      const error = new Error('Concurrent mutation race detected');
      error.name = 'ConcurrentMutationException';
      throw error;
    }

    await this.prisma.eRPSyncHistory.create({
      data: {
        jobId,
        statusFrom: result?.statusFrom || null,
        statusTo: status,
        reason: result?.reason || null,
      },
    });
  }

  async logSyncEvent(log: any): Promise<void> {
    // Left empty: Sync events now tracked via ErpSyncAttempt and outbox architecture
  }

  async findJobByIdempotencyHash(hash: string): Promise<any> {
    return this.prisma.eRPSyncJob.findUnique({
      where: { idempotencyHash: hash },
    });
  }

  async findStrandedSyncJobs(minutes: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - minutes * 60000);
    return this.prisma.eRPSyncJob.findMany({
      where: {
        status: ERPSyncStatus.SYNCING,
        lastAttemptAt: { lt: cutoff },
      },
      include: {
        voucherCandidate: true,
      },
    });
  }
}
