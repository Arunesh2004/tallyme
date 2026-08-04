import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IVoucherRepository } from '../interfaces/voucher.interfaces';
import {
  VOUCHER_REPOSITORY,
  TALLY_SYNC_QUEUE,
  VOUCHER_STATUS,
} from '../constants/voucher.constants';
import { VoucherBuilderEngine } from '../services/voucher-builder.engine';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { propagation, context } from '@opentelemetry/api';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { PeriodLockedException } from '../../../shared/exceptions/PeriodLockedException';

@Injectable()
export class ProcessVoucherBuilderUseCase {
  constructor(
    @Inject(VOUCHER_REPOSITORY) private readonly repository: IVoucherRepository,
    private readonly builderEngine: VoucherBuilderEngine,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService, // injected PrismaService for outbox
    private readonly periodService: AccountingPeriodService,
  ) {}

  async execute(payload: any): Promise<void> {
    const startTime = Date.now();
    const candidateId = payload.candidateId || payload.feeAllocationCandidateId;
    this.logger.debug(
      `Building voucher for candidate ${candidateId}`,
      'ProcessVoucherBuilderUseCase',
    );

    // Idempotency check:
    if (payload.candidateId) {
      const existingCandidate = await this.prisma.voucherCandidate.findFirst({
        where: {
          metadata: {
            path: ['invoiceCandidateId'],
            equals: payload.candidateId,
          },
        },
      });
      if (existingCandidate) {
        this.logger.warn(
          `Idempotency Hit: VoucherCandidate already exists for draft ${payload.candidateId}. Halting execution.`,
          'ProcessVoucherBuilderUseCase'
        );
        return; // STOP execution
      }
    }

    const companyId = payload.companyId;
    const companyExists = await this.repository.checkCompanyExists(companyId);
    if (!companyExists) {
      throw new Error(`Company ${companyId} not found`);
    }

    // If it's the old payload from Student Fee (which only sent feeAllocationCandidateId and companyId),
    // we need to adapt it. If it's the new Generic Payload, we use it directly.
    let buildPayload = payload;

    if (!payload.voucherType && payload.feeAllocationCandidateId) {
      const candidate = await this.repository.findFeeAllocationCandidateById(
        payload.feeAllocationCandidateId,
      );
      if (!candidate || !candidate.studentPaymentCandidate) {
        throw new Error(
          `Fee allocation candidate ${payload.feeAllocationCandidateId} not found or missing payment candidate`,
        );
      }
      buildPayload = {
        voucherType: 'RECEIPT',
        candidateId: payload.feeAllocationCandidateId,
        companyId,
        allocationData: {
          allocatedAmount:
            Number(candidate.studentPaymentCandidate.amount) || 0,
          allocationBreakdown: [
            {
              feeHeadName: 'Fee Collection',
              allocated: Number(candidate.studentPaymentCandidate.amount) || 0,
            },
          ],
        },
        paymentData: {
          gateway: candidate.studentPaymentCandidate.paymentGateway || '',
          transactionId:
            candidate.studentPaymentCandidate.paymentCandidateId || '',
          amount: Number(candidate.studentPaymentCandidate.amount) || 0,
        },
        student: {
          id: candidate.studentPaymentCandidate.studentId,
          admissionNumber: candidate.studentPaymentCandidate.admissionNumber,
        },
      };
    }

    // Resolve voucherDate early for period validation
    const voucherDate = buildPayload.invoice?.date
      ? new Date(buildPayload.invoice.date)
      : new Date();

    try {
      await this.periodService.validatePostingAllowed(companyId, voucherDate);
    } catch (err: any) {
      if (err instanceof PeriodLockedException || err.name === 'PeriodLockedException') {
        this.logger.warn(
          `Voucher generation blocked by period lock: ${err.message}`,
          'ProcessVoucherBuilderUseCase'
        );
        // Preserve idempotency and mark safely
        await this.repository.saveVoucherResult({
          voucherType: buildPayload.voucherType || 'RECEIPT',
          voucherNumber: 'BLOCKED',
          date: voucherDate,
          studentId: buildPayload.student?.id || null,
          feeAllocationCandidateId: buildPayload.voucherType === 'RECEIPT' ? buildPayload.candidateId : null,
          batchSyncItemId: buildPayload.batchSyncItemId,
          companyId: buildPayload.companyId,
          totalDebit: 0,
          totalCredit: 0,
          validationStatus: VOUCHER_STATUS.MANUAL_REVIEW,
          warnings: [err.message],
          manualReviewRequired: true,
          lines: [],
          references: [],
          narrations: [],
          metadata: {
            ...(buildPayload.metadata || {}),
            invoiceCandidateId: buildPayload.candidateId || null,
            periodLockError: err.message
          }
        }, { level: 'WARN', message: 'Voucher blocked by period lock', details: {} });
        return;
      }
      throw err;
    }

    let buildResult;

    try {
      buildResult = await this.builderEngine.build(buildPayload);
    } catch (error: any) {
      this.logger.error(
        `Failed to build voucher`,
        (error as Error).stack,
        'ProcessVoucherBuilderUseCase',
      );
      throw error;
    }

    // voucherDate is already resolved above for period validation

    const candidateData = {
      voucherType: buildResult.voucherType,
      voucherNumber: buildResult.voucherNumber,
      date: voucherDate,
      studentId: buildPayload.student?.id || null,
      feeAllocationCandidateId:
        buildPayload.voucherType === 'RECEIPT'
          ? buildPayload.candidateId
          : null,
      batchSyncItemId: buildPayload.batchSyncItemId,
      companyId: buildPayload.companyId,
      totalDebit: buildResult.totalDebit,
      totalCredit: buildResult.totalCredit,
      validationStatus: buildResult.status,
      warnings: buildResult.warnings,
      manualReviewRequired: buildResult.status === VOUCHER_STATUS.MANUAL_REVIEW,
      lines: buildResult.lines.map((l: any) => {
        if (!l.ledgerName || l.ledgerName === 'UNKNOWN_LEDGER') {
          buildResult.status = VOUCHER_STATUS.MANUAL_REVIEW;
          buildResult.warnings.push(
            'Contains UNKNOWN_LEDGER or missing ledger',
          );
        }
        return {
          voucherLedgerId: l.ledgerId,
          ledgerName: l.ledgerName,
          type: l.type,
          amount: l.amount,
          description: l.description,
          isParty: l.isParty || false,
        };
      }),
      references: buildResult.references.map((r: any) => ({
        referenceType: r.type,
        referenceValue: r.value,
      })),
      narrations: buildResult.narrations.map((n: any) => ({
        content: n,
        isAutoGenerated: true,
      })),
      metadata: {
        ...(buildPayload.metadata || {}),
        invoiceCandidateId: buildPayload.candidateId || null,
        lineItems: buildResult.lines.map((l: any) => ({
          description: l.description || null,
          hsnSac: l.hsnSac || null,
          quantity: l.quantity || null,
          unit: l.unit || null,
          rate: l.rate || null,
          amount: l.amount || null,
        })),
      },
    };

    // Phase 4: Reject UNKNOWN_LEDGER or debit/credit mismatch or missing GST
    const isGstMissing =
      candidateData.metadata?.ledgerDecisions?.tax === undefined &&
      buildPayload.invoice?.tax > 0;

    if (
      buildResult.status === VOUCHER_STATUS.MANUAL_REVIEW ||
      buildResult.totalDebit !== buildResult.totalCredit ||
      isGstMissing
    ) {
      candidateData.validationStatus = VOUCHER_STATUS.MANUAL_REVIEW;
      candidateData.manualReviewRequired = true;
      if (buildResult.totalDebit !== buildResult.totalCredit) {
        candidateData.warnings.push('Debit and Credit totals do not match');
      }
      if (isGstMissing) {
        candidateData.warnings.push('GST Ledger unresolved but tax is present');
      }
    }

    const logData = {
      level: 'INFO',
      message: 'Voucher validation executed',
      details: { executionTimeMs: Date.now() - startTime } as any,
    };

    const savedCandidate = await this.repository.saveVoucherResult(
      candidateData,
      logData,
    );

    // Emit outbox event
    if (payload.candidateId) {
      await this.prisma.transactionOutbox.create({
        data: {
          aggregateType: 'VoucherCandidate',
          aggregateId: savedCandidate.id,
          eventType: 'VOUCHER_CREATED',
          payload: { draftId: payload.candidateId },
          status: 'PENDING'
        }
      });
    }

    if (buildResult.status === VOUCHER_STATUS.VALIDATED) {
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      await this.queue.addJob(TALLY_SYNC_QUEUE, 'sync-tally', {
        voucherCandidateId: savedCandidate.id,
        traceparent: carrier.traceparent,
        correlationId: payload.correlationId,
      });
      // In real implementation, update candidate status to READY_FOR_SYNC after queueing
    }
  }
}
