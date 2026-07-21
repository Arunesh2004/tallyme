import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IERPRepository } from '../interfaces/erp.interfaces';
import { ERP_REPOSITORY } from '../constants/erp.constants';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERPIdempotencyException } from '../exceptions/erp.exceptions';
import {
  IdempotencyCheckRequest,
  IdempotencyCheckResult,
} from '../dto/idempotency.dto';

@Injectable()
export class ERPIdempotencyService {
  constructor(
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Generates a deterministic idempotency key from immutable business facts.
   * Standardizes inputs to prevent case or spacing variations from causing hash mismatches.
   */
  generateHash(request: IdempotencyCheckRequest): string {
    if (
      !request.companyId ||
      !request.voucherCandidateId ||
      !request.voucherNumber
    ) {
      throw new ERPIdempotencyException(
        'Missing required fields for idempotency hash generation',
        'HASH_FAILURE',
      );
    }

    // Stable, deterministic hashing pattern
    const standardizedCompanyId = request.companyId.trim().toLowerCase();
    const standardizedCandidateId = request.voucherCandidateId
      .trim()
      .toLowerCase();
    const standardizedVoucherNo = request.voucherNumber.trim().toUpperCase();

    const raw = `${standardizedCompanyId}:${standardizedCandidateId}:${standardizedVoucherNo}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Finds an existing job based on the deterministic hash to prevent replay duplicates.
   */
  async findExistingJob(hash: string): Promise<any> {
    return this.repository.findJobByIdempotencyHash(hash);
  }

  /**
   * Boolean check for existence, safely abstracting DB interactions.
   */
  async isDuplicate(hash: string): Promise<IdempotencyCheckResult> {
    const job = await this.findExistingJob(hash);
    if (!job) {
      return { isDuplicate: false };
    }
    return {
      isDuplicate: true,
      jobId: job.id,
      status: job.status,
    };
  }

  /**
   * Safely inserts a new job while gracefully handling unique constraint race conditions
   * caused by horizontal scaling or rapid duplicate requests.
   */
  async createJobIfAbsent(
    jobData: any,
    request: IdempotencyCheckRequest,
  ): Promise<any> {
    const hash = this.generateHash(request);

    const dbJobData = {
      ...jobData,
      idempotencyHash: hash,
    };

    try {
      // Delegate to repository which uses Prisma's native create (with unique constraint)
      const job = await this.repository.createSyncJob(dbJobData);

      this.logger.debug(
        {
          message: 'Created new ERP sync job',
          voucherCandidateId: request.voucherCandidateId,
          idempotencyHash: hash.substring(0, 16) + '...',
          jobId: job.id,
        },
        'ERPIdempotencyService',
      );

      return job;
    } catch (error: any) {
      // Catch Prisma's native Unique Constraint Violation error code (P2002)
      if (error?.code === 'P2002') {
        this.logger.warn(
          {
            message:
              'Duplicate job creation prevented by unique constraint race condition',
            voucherCandidateId: request.voucherCandidateId,
            idempotencyHash: hash.substring(0, 16) + '...',
          },
          'ERPIdempotencyService',
        );
        throw new ERPIdempotencyException(
          'Duplicate job creation prevented by unique constraint',
          'DUPLICATE_RACE',
        );
      }

      this.logger.error(
        'Unexpected database error during idempotency creation',
        error.stack,
        'ERPIdempotencyService',
      );
      throw new ERPIdempotencyException(
        `Database error: ${error.message}`,
        'DB_ERROR',
      );
    }
  }
}
