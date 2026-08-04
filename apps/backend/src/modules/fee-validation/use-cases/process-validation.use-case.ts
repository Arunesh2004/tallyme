import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IFeeValidationRepository } from '../interfaces/validation.interfaces';
import {
  VALIDATION_REPOSITORY,
  VOUCHER_GENERATION_QUEUE,
} from '../constants/validation.constants';
import { FeeValidationEngine } from '../services/validation.engine';
import { FeeAllocationEngine } from '../services/allocation.engine';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { InvalidValidationCandidateException } from '../exceptions/validation.exceptions';

@Injectable()
export class ProcessValidationUseCase {
  constructor(
    @Inject(VALIDATION_REPOSITORY)
    private readonly repository: IFeeValidationRepository,
    private readonly validationEngine: FeeValidationEngine,
    private readonly allocationEngine: FeeAllocationEngine,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
  ) {}

  async execute(studentPaymentCandidateId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(
      `Validating payment candidate ${studentPaymentCandidateId}`,
      'ProcessValidationUseCase',
    );

    const candidate = await this.repository.findStudentPaymentCandidateById(
      studentPaymentCandidateId,
    );

    if (!candidate) {
      throw new InvalidValidationCandidateException(
        `Student payment candidate ${studentPaymentCandidateId} not found`,
      );
    }

    if (!candidate.studentId) {
      throw new InvalidValidationCandidateException(
        `Student payment candidate ${studentPaymentCandidateId} is not matched to a student`,
      );
    }

    const outstandings = await this.repository.getStudentOutstandings(
      candidate.studentId,
    );

    if (!candidate.paymentCandidateId)
      throw new Error('Missing transaction ID');
    const paymentData = {
      amount: Number(candidate.amount) || 0,
      transactionId: candidate.paymentCandidateId,
    };
    const studentProfile = {
      outstandings,
    };

    const validationResult = await this.validationEngine.validate(
      paymentData,
      studentProfile,
    );

    let allocationResult: any = {
      allocations: [],
      feeHeadsAffected: [],
      allocatedAmount: 0,
      remainingAmount: paymentData.amount,
    };
    if (!validationResult.requiresManualReview) {
      allocationResult = this.allocationEngine.allocate(
        paymentData.amount,
        studentProfile.outstandings,
      );
    }

    const candidateData = {
      studentPaymentCandidateId,
      studentId: candidate.studentId,
      paymentAmount: paymentData.amount,
      allocatedAmount: allocationResult.allocatedAmount,
      remainingAmount: allocationResult.remainingAmount,
      feeHeads: allocationResult.feeHeadsAffected,
      allocationBreakdown: allocationResult.allocations as any,
      validationStatus: validationResult.status,
      validationWarnings: validationResult.warnings,
      requiresManualReview: validationResult.requiresManualReview,
      duplicateCandidate: validationResult.duplicateCandidate,
      confidence: 100,
      rawValidationData: validationResult.rawValidationData as any,
    };

    const logData = {
      level: 'INFO',
      message: 'Validation executed',
      details: { executionTimeMs: Date.now() - startTime } as any,
    };

    const savedCandidate = await this.repository.saveValidationResult(
      candidateData,
      logData,
      [],
    );

    if (!validationResult.requiresManualReview) {
      await this.queue.addJob(VOUCHER_GENERATION_QUEUE, 'generate-voucher', {
        feeAllocationCandidateId: savedCandidate.id,
      });
    }
  }
}
