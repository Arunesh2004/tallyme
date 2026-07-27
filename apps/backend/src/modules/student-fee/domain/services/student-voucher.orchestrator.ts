// src/modules/student-fee/domain/services/student-voucher.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { FeeAllocation } from '../entities';
import { IQueueService } from '../../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';
import { VOUCHER_BUILDER_QUEUE } from '../../../voucher-builder/constants/voucher.constants';
import { CompanyContextService } from '../../../../core/context/company-context.service';

@Injectable()
export class StudentVoucherMappingPolicy {
  getBankLedger(paymentMethod: string): string {
    return paymentMethod;
  }
}

@Injectable()
export class StudentNarrationPolicy {
  generate(studentName: string, reference: string): string {
    return `Being fee received from ${studentName} vide Ref: ${reference}`;
  }
}

@Injectable()
export class StudentVoucherOrchestrator {
  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly mappingPolicy: StudentVoucherMappingPolicy,
    private readonly narrationPolicy: StudentNarrationPolicy,
    private readonly companyContext: CompanyContextService,
  ) {}

  async orchestrate(
    allocations: FeeAllocation[],
    bankLedger: string,
    studentName: string,
    ref: string,
    companyId: string,
  ): Promise<Result<any, string>> {
    const allocationBreakdown = allocations.map((a) => ({
      feeHeadName: a.outstandingFeeId,
      allocated: a.allocatedAmount.amount.toNumber(),
    }));

    const totalCredit = allocationBreakdown.reduce(
      (sum, a) => sum + a.allocated,
      0,
    );

    const payload = {
      voucherType: 'RECEIPT',
      companyId: companyId,
      allocationData: {
        allocationBreakdown,
        remainingAmount: 0, // Simplified for now
      },
      paymentData: {
        amount: totalCredit,
        reference: ref,
        bankLedger,
      },
      student: { name: studentName },
    };

    // Dispatch to Shared Accounting Engine via Queue
    await this.queueService.addJob(
      VOUCHER_BUILDER_QUEUE,
      'build-receipt-voucher',
      payload,
    );

    return ok({ status: 'QUEUED' });
  }
}
