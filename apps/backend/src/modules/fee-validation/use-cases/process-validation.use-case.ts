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

    // MOCK: Fetch payment candidate and student fee profile
    // In real implementation, these would come from matching repo & fee profile repo.
    const mockPaymentData = { amount: 8000, transactionId: 'TX123' };
    const mockStudentProfile = {
      outstandings: [
        {
          id: 'due_1',
          amount: 8000,
          isPaid: false,
          feeHeadId: 'h_1',
          feeHead: { name: 'Tuition', priority: 10 },
          dueDate: new Date(),
        },
      ],
    };

    const validationResult = await this.validationEngine.validate(
      mockPaymentData,
      mockStudentProfile,
    );

    let allocationResult: any = {
      allocations: [],
      feeHeadsAffected: [],
      allocatedAmount: 0,
      remainingAmount: mockPaymentData.amount,
    };
    if (!validationResult.requiresManualReview) {
      allocationResult = this.allocationEngine.allocate(
        mockPaymentData.amount,
        mockStudentProfile.outstandings,
      );
    }

    const candidateData = {
      studentPaymentCandidateId,
      studentId: 'MOCK_STUDENT_ID',
      paymentAmount: mockPaymentData.amount,
      allocatedAmount: allocationResult.allocatedAmount,
      remainingAmount: allocationResult.remainingAmount,
      feeHeads: allocationResult.feeHeadsAffected,
      allocationBreakdown: allocationResult.allocations as any,
      validationStatus: validationResult.status,
      validationWarnings: validationResult.warnings,
      requiresManualReview: validationResult.requiresManualReview,
      duplicateCandidate: validationResult.duplicateCandidate,
      confidence: 100, // mock
      rawValidationData: validationResult.rawValidationData as any,
    };

    const logData = {
      level: 'INFO',
      message: 'Validation executed',
      details: { executionTimeMs: Date.now() - startTime } as any,
    };

    const savedCandidate = await this.repository.saveValidationResult(candidateData, logData, []);

    if (!validationResult.requiresManualReview) {
      await this.queue.addJob(VOUCHER_GENERATION_QUEUE, 'generate-voucher', {
        feeAllocationCandidateId: savedCandidate.id,
      });
    }
  }
}
