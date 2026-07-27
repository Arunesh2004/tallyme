// application/commands/index.ts
export class ParsePaymentEmailCommand {
  constructor(public readonly emailRawId: string) {}
}
export class MatchStudentCommand {
  constructor(public readonly candidateId: string, public readonly companyId: string) {}
}
export class AllocateFeeCommand {
  constructor(public readonly paymentId: string) {}
}
export class GenerateVoucherCommand {
  constructor(public readonly allocationId: string) {}
}

// application/handlers/index.ts
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events';
import { StudentMatcher } from '../domain/services/student-matching.service';
import { FeeAllocationService } from '../domain/services/fee-allocation.service';
import { StudentVoucherOrchestrator } from '../domain/services/student-voucher.orchestrator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentCandidate } from '../domain/entities';
import {
  PaymentReference,
  TransactionId,
  PaymentAmount,
} from '../domain/value-objects';
import { LoggerService } from '../../../core/logger/logger.service';
import { StudentIntelligenceService } from '../../accounting-intelligence/workflows/student-intelligence.service';
import { LedgerMappingEngine } from '../../accounting-intelligence/ledger-mapping/ledger-mapping.engine';
import { AccountingRulesEngine } from '../../accounting-intelligence/rules-engine/accounting-rules.engine';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import {
  AccountingTransaction,
  TransactionType,
} from '../../../shared/domain/accounting-transaction';
import { ValidationStatus } from '../../../shared/domain/extraction-confidence';

@Injectable()
export class MatchStudentCommandHandler {
  constructor(
    private readonly matcher: StudentMatcher,
    private readonly feeAllocator: FeeAllocationService,
    private readonly orchestrator: StudentVoucherOrchestrator,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly studentIntelligence: StudentIntelligenceService,
    private readonly ledgerMappingEngine: LedgerMappingEngine,
    private readonly rulesEngine: AccountingRulesEngine,
    private readonly auditService: AccountingDecisionAuditService,
  ) {}

  async execute(command: MatchStudentCommand, tx: any): Promise<void> {
    this.logger.log(
      `Executing MatchStudentCommand for ${command.candidateId}`,
      'MatchStudentCommandHandler',
    );

    // 1. Load Candidate
    const prismaCandidate =
      await this.prisma.studentPaymentCandidate.findUnique({
        where: { id: command.candidateId },
      });

    if (!prismaCandidate) {
      throw new Error(`Candidate not found: ${command.candidateId}`);
    }

    // Convert Prisma model to Domain entity
    if (!prismaCandidate.bankReference || !prismaCandidate.gatewayTransactionId) {
      throw new Error(`Missing critical reference fields for payment ${prismaCandidate.id}`);
    }
    const domainCandidate = new PaymentCandidate(
      prismaCandidate.id,
      new PaymentReference(prismaCandidate.bankReference),
      new TransactionId(prismaCandidate.gatewayTransactionId),
      new PaymentAmount((prismaCandidate.amount as any) || 0),
      prismaCandidate.paymentDate || new Date(),
      prismaCandidate.rawStudentName || 'Unidentified Student',
      'No remarks',
      'PENDING',
    );

    // 2. Call Matcher
    const matchResult = await this.matcher.match(domainCandidate);

    if (matchResult.isFailure) {
      this.logger.warn(
        `Matching failed: ${matchResult.error}`,
        'MatchStudentCommandHandler',
      );
      await this.prisma.studentPaymentCandidate.update({
        where: { id: command.candidateId },
        data: { status: 'MANUAL_REVIEW_REQUIRED' },
      });
      return;
    }
    const studentMatch = matchResult.unwrap();

    // 3. Save Match
    await this.prisma.studentPaymentCandidate.update({
      where: { id: command.candidateId },
      data: {
        studentId: studentMatch.studentId,
        status: 'MATCHED',
      },
    });

    // 4. Fee Allocation
    const allocationResult = await this.feeAllocator.allocate(
      command.candidateId,
    );

    // Map breakdown to FeeAllocation objects
    const feeAllocations: any[] = allocationResult.breakdown.map((b: any) => ({
      outstandingFeeId: b.feeHeadName,
      allocatedAmount: { amount: { toNumber: () => b.amount } },
    }));

    // Phase 17B: Accounting Intelligence Integration
    const studentResolution = await this.studentIntelligence.preSyncValidation(
      command.candidateId,
    );
    if (!studentResolution) {
      await this.prisma.studentPaymentCandidate.update({
        where: { id: command.candidateId },
        data: { status: 'MANUAL_REVIEW_REQUIRED' },
      });
      return;
    }

    const incomeLedgerDecision =
      await this.ledgerMappingEngine.resolveIncomeLedger(
        studentMatch.studentId,
        studentResolution.feeStructure,
      );
    if (incomeLedgerDecision.selectedLedger === 'UNKNOWN_LEDGER') {
      await this.prisma.studentPaymentCandidate.update({
        where: { id: command.candidateId },
        data: { status: 'MANUAL_REVIEW_REQUIRED' },
      });
      return;
    }

    const incomeLedgerName = incomeLedgerDecision.selectedLedger;
    const studentName = prismaCandidate.rawStudentName || 'Student';
    const ref = prismaCandidate.bankReference || 'REF';
    const totalAmount = prismaCandidate.amount
      ? Number(prismaCandidate.amount)
      : 100;

    const accTx = new AccountingTransaction(
      command.candidateId,
      command.companyId,
      TransactionType.RECEIPT,
      'STUDENT_FEE',
      prismaCandidate.paymentDate || new Date(),
      [
        {
          id: studentMatch.studentId,
          type: 'STUDENT',
          ledgerName: 'Sundry Debtors Default',
        },
      ],
      [
        {
          id: 'line-1',
          ledgerName: incomeLedgerName,
          amount: totalAmount,
          isDebit: false,
        },
      ],
      [],
      totalAmount,
      { ref },
      [],
      ValidationStatus.AUTO_APPROVED,
    );

    const ruleDecision = await this.rulesEngine.evaluate(accTx);
    if (ruleDecision.requiresApproval) {
      await this.prisma.studentPaymentCandidate.update({
        where: { id: command.candidateId },
        data: { status: 'MANUAL_REVIEW_REQUIRED' },
      });
      return;
    }

    await this.auditService.logDecision({
      companyId: command.companyId,
      inputData: {
        candidateId: command.candidateId,
        studentName,
        amount: totalAmount,
      },
      ledgerDecision: incomeLedgerDecision,
      appliedRules: ruleDecision.appliedRules,
      confidence: ruleDecision.confidence,
    });

    // 5. Generate Voucher via Orchestrator
    await this.orchestrator.orchestrate(
      feeAllocations,
      incomeLedgerName,
      studentName,
      ref,
      command.companyId
    );

    this.logger.log(
      `Successfully completed student workflow for ${command.candidateId}`,
      'MatchStudentCommandHandler',
    );
  }
}

// application/queries/index.ts
export class PaymentStatusQuery {
  constructor(public readonly transactionId: string) {}
}
export class StudentOutstandingFeeQuery {
  constructor(public readonly studentId: string) {}
}
