// src/modules/student-fee/domain/services/student-voucher.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { FeeAllocation } from '../entities';
import { Inject } from '@nestjs/common';
import { CompanyContextService } from '../../../../core/context/company-context.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { TransactionDraftService } from '../../../universal-transaction/services/transaction-draft.service';
import { StudentFeeDraftAdapter } from '../../application/student-fee-draft.adapter';

@Injectable()
export class StudentVoucherMappingPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async getBankLedger(paymentMethod: string): Promise<string> {
    const config = await this.prisma.ledgerMappingConfiguration.findFirst();
    if (config) {
      if (
        config.feeCategories &&
        (config.feeCategories as any)[paymentMethod]
      ) {
        return (config.feeCategories as any)[paymentMethod];
      }
      if (config.bankLedger) {
        return config.bankLedger;
      }
    }
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
    private readonly mappingPolicy: StudentVoucherMappingPolicy,
    private readonly narrationPolicy: StudentNarrationPolicy,
    private readonly companyContext: CompanyContextService,
    private readonly draftService: TransactionDraftService,
    private readonly adapter: StudentFeeDraftAdapter,
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

    // Map legacy payload to canonical draft
    const canonicalModel = this.adapter.map(payload, `student-fee-${Date.now()}`);

    // Create Draft (Wait in DRAFT status)
    const draft = await this.draftService.createDraft(canonicalModel, 'system-orchestrator');

    return ok({ status: 'DRAFT_CREATED', draftId: draft.id });
  }
}
