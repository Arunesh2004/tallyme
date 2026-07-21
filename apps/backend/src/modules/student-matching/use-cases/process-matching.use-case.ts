import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IMatchingRepository } from '../interfaces/matching.interfaces';
import {
  MATCHING_REPOSITORY,
  FEE_VALIDATION_QUEUE,
} from '../constants/matching.constants';
import { MatchingEngine } from '../services/matching.engine';
import { ConflictDetector } from '../services/conflict.detector';
import { IPaymentParserRepository } from '../../payment-parser/interfaces/parser.interfaces';
import { PAYMENT_PARSER_REPOSITORY } from '../../payment-parser/constants/parser.constants';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';

@Injectable()
export class ProcessMatchingUseCase {
  constructor(
    @Inject(MATCHING_REPOSITORY)
    private readonly repository: IMatchingRepository,
    @Inject(PAYMENT_PARSER_REPOSITORY)
    private readonly paymentRepo: IPaymentParserRepository,
    private readonly matchingEngine: MatchingEngine,
    private readonly conflictDetector: ConflictDetector,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
  ) {}

  async execute(paymentCandidateId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(
      `Processing matching for candidate ${paymentCandidateId}`,
      'ProcessMatchingUseCase',
    );

    // Fetch the candidate from DB. Assuming prisma allows simple find.
    // In real implementation, inject PaymentParserRepository or PrismaService
    // We'll mock it for milestone simplicity
    const candidate = {
      id: paymentCandidateId,
      admissionNumber: 'ADM-2026-001',
      studentName: 'John Doe',
      amount: 1500,
    };

    const result = await this.matchingEngine.match(candidate);
    const conflicts = this.conflictDetector.detect(result.matchedIds);

    const candidateData = {
      paymentCandidateId,
      studentId: result.matchedIds.length === 1 ? result.matchedIds[0] : null,
      admissionNumber: candidate.admissionNumber,
      matchedBy: result.breakdown
        .filter((r) => r.score > 0)
        .map((r) => r.ruleName)
        .join(','),
      confidence: result.score,
      matchingStrategy: 'DETERMINISTIC_RULES',
      matchingScore: result.score,
      status: result.status as any,
      manualReviewRequired: result.status === 'MANUAL_REVIEW',
      warnings: conflicts,
      rawMatchingData: { breakdown: result.breakdown } as any,
    };

    const attemptData = {
      strategyUsed: 'DETERMINISTIC_RULES',
      executionTimeMs: Date.now() - startTime,
      resultStatus: result.status,
    };

    const savedMatch = await this.repository.saveMatchingResult(candidateData, attemptData, [], []);

    if (result.status === 'MATCHED' && !conflicts.length) {
      await this.queue.addJob(FEE_VALIDATION_QUEUE, 'validate-fee', {
        studentPaymentCandidateId: savedMatch.id,
      });
    }
  }
}
