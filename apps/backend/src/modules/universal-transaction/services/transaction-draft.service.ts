import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionDraftRepository } from '../repositories/transaction-draft.repository';
import { IAccountingPolicyEngine } from '../../accounting-policy/interfaces/accounting-policy.interface';
import { AccountingPolicyService } from '../../accounting-policy/services/accounting-policy.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { UpdateDraftDto, ActionDraftDto } from '../dto/transaction.dto';
import { TransactionStatus, DuplicateRecommendedAction } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CanonicalAccountingModel } from '../domain/types';
import { DuplicateDetectionService } from '../../duplicate-detection/services/duplicate-detection.service';
import { DuplicateDetectionRequest } from '../../duplicate-detection/dto/duplicate-detection-request.dto';
import { DuplicateDetectedException } from '../../duplicate-detection/exceptions/duplicate-detection.exceptions';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';

@Injectable()
export class TransactionDraftService {
  constructor(
    private readonly repository: TransactionDraftRepository,
    private readonly outboxRepository: TransactionOutboxRepository,
    private readonly policyEngine: AccountingPolicyService,
    private readonly periodService: AccountingPeriodService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly prisma: PrismaService,
    private readonly prometheusService: PrometheusService
  ) {}

  async createDraft(payload: CanonicalAccountingModel, userId: string) {
    // Map CanonicalAccountingModel to DuplicateDetectionRequest
    const duplicateRequest: DuplicateDetectionRequest = {
      tenantId: payload.header.tenantId,
      vendorId: payload.parties?.vendorId || '',
      invoiceNumber: payload.header.invoiceNumber,
      invoiceDate: payload.header.invoiceDate,
      amount: payload.ledgerEntries.find(e => !e.isDebit)?.amount,
      documentHash: payload.metadata?.documentHash
    };

    return await this.prisma.$transaction(async (tx) => {
      // Evaluate for duplicates
      const { decision, fingerprint } = await this.duplicateDetectionService.evaluate(duplicateRequest);

      // Auto Block
      if (decision.recommendedAction === DuplicateRecommendedAction.AUTO_BLOCK) {
        throw new DuplicateDetectedException(`Exact duplicate detected. Invoice ${duplicateRequest.invoiceNumber} is blocked.`);
      }

      // Validate Draft Rules
      const validationResult = await this.policyEngine.validateDraft(payload);
      if (!validationResult.valid) {
        console.warn(`Draft validation failed during creation. Proceeding to persist for manual review. Errors: ${JSON.stringify(validationResult.errors)}`);
      }

      // Persist Fingerprint
      await this.duplicateDetectionService.persistFingerprint(fingerprint, decision, tx);

      // Persist Draft
      const finalPayload = validationResult.normalizedPayload || payload;
      
      // Inject validation errors if any, so they are stored in the draft
      finalPayload.metadata = finalPayload.metadata || { auditVersion: 1 };
      if (!validationResult.valid) {
        finalPayload.metadata.validationErrors = validationResult.errors.map(e => e.message);
        finalPayload.metadata.warnings = validationResult.warnings.map(w => w.message);
      }
      
      // Inject duplicate warnings if any
      if (decision.recommendedAction === DuplicateRecommendedAction.ALLOW_WITH_WARNING || decision.recommendedAction === DuplicateRecommendedAction.REQUIRE_CHECKER) {
        finalPayload.metadata = finalPayload.metadata || { auditVersion: 1 };
        finalPayload.metadata.warnings = finalPayload.metadata.warnings || [];
        finalPayload.metadata.warnings.push(`Duplicate check warning: ${decision.decisionReason}`);
      }

      const draft = await this.repository.createDraft(finalPayload, userId, tx);
      return draft;
    });
  }

  async getDraft(id: string, userTenantId: string) {
    const draft = await this.prisma.transactionDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException(`Draft ${id} not found`);
    if (draft.tenantId !== userTenantId) {
      throw new BadRequestException(`Access denied to draft outside of your tenant scope`);
    }
    return draft;
  }

  async updateDraft(id: string, userId: string, userTenantId: string, dto: UpdateDraftDto) {
    const draft = await this.getDraft(id, userTenantId);
    
    if (draft.status !== TransactionStatus.DRAFT && draft.status !== TransactionStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Cannot update draft in status ${draft.status}`);
    }

    // ENFORCING IMMUTABILITY: Base payload remains untouched.
    // User edits are stored ONLY in the Completion Draft.
    const originalPayload = draft.payload as any;
    
    // We update metadata to contain the completion draft
    originalPayload.metadata = originalPayload.metadata || {};
    originalPayload.metadata.completionDraft = dto.payload;
    
    // Bump version for optimistic concurrency
    originalPayload.metadata.auditVersion = (originalPayload.metadata.auditVersion || 1) + 1;

    return await this.repository.updateDraftWithOptimisticLocking(
      id,
      dto.currentVersion,
      userId,
      originalPayload as CanonicalAccountingModel,
      TransactionStatus.DRAFT,
      'Draft updated (Completion Draft modified)'
    );
  }

  async approveDraft(id: string, userId: string, userTenantId: string, dto: ActionDraftDto) {
    // 1. Fetch current draft (enforces tenant isolation)
    const draft = await this.getDraft(id, userTenantId);
    
    if (draft.status !== TransactionStatus.DRAFT && draft.status !== TransactionStatus.PENDING_APPROVAL && draft.status !== TransactionStatus.REJECTED) {
      throw new BadRequestException(`Cannot approve draft in status ${draft.status}`);
    }

    const payload = draft.payload as unknown as CanonicalAccountingModel;
    const completionDraft = (payload.metadata as any).completionDraft || payload;

    // Period validation
    const targetDate = new Date(completionDraft.header.invoiceDate || completionDraft.header.dueDate || Date.now());
    await this.periodService.validatePostingAllowed(completionDraft.header.companyId, targetDate);

    // 2. Strict Validation Check: Cannot approve if invalid
    const validationResult = await this.policyEngine.validateDraft(completionDraft);
    if (!validationResult.valid) {
      throw new BadRequestException({
        message: 'Draft fails accounting policy validation',
        errors: validationResult.errors
      });
    }

    // 3. Mark approved inside a transaction
    return await this.prisma.$transaction(async (tx) => {
      payload.metadata.approvalMetadata = {
        approvedBy: userId,
        approvedAt: new Date().toISOString()
      };

      const updatedDraft = await this.repository.updateDraftWithOptimisticLocking(
        id,
        dto.currentVersion,
        userId,
        payload,
        TransactionStatus.APPROVED,
        dto.reason || 'Approved by user',
        tx
      );

      await this.outboxRepository.createEvent({
        aggregateType: 'TransactionDraft',
        aggregateId: id,
        eventType: 'DRAFT_APPROVED',
        payload: { draftId: id }
      }, tx);

      return updatedDraft;
    });
  }

  async rejectDraft(id: string, userId: string, userTenantId: string, dto: ActionDraftDto) {
    // Enforce tenant isolation
    const draft = await this.getDraft(id, userTenantId);
    
    if (draft.status !== TransactionStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Only PENDING_APPROVAL drafts can be rejected`);
    }

    return await this.repository.updateDraftWithOptimisticLocking(
      id,
      dto.currentVersion,
      userId,
      draft.payload as unknown as CanonicalAccountingModel,
      TransactionStatus.REJECTED,
      dto.reason || 'Rejected by checker'
    );
  }

  async updateStatus(id: string, status: TransactionStatus) {
    await this.prisma.transactionDraft.update({
      where: { id },
      data: { status }
    });
  }

  async markFailed(id: string, reason: string) {
    const draft = await this.prisma.transactionDraft.findUnique({ where: { id } });
    if (!draft) return;
    
    const payload = draft.payload as unknown as CanonicalAccountingModel;
    payload.metadata = payload.metadata || { auditVersion: 1 };
    payload.metadata.errors = payload.metadata.errors || [];
    payload.metadata.errors.push(`ERP Sync Failed: ${reason}`);

    await this.prisma.transactionDraft.update({
      where: { id },
      data: { 
        status: TransactionStatus.FAILED,
        payload: payload as any
      }
    });

    this.prometheusService.draftFailedTotal.inc();
  }

  async retryFailedDraft(id: string, userId: string, userTenantId: string) {
    const draft = await this.getDraft(id, userTenantId);

    if (draft.status !== TransactionStatus.FAILED) {
      throw new BadRequestException(`Only FAILED drafts can be retried`);
    }

    const payload = draft.payload as unknown as CanonicalAccountingModel;
    if (payload.metadata?.errors) {
      payload.metadata.errors = [];
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedDraft = await tx.transactionDraft.update({
        where: { id },
        data: {
          status: TransactionStatus.APPROVED,
          payload: payload as any
        }
      });

      await this.outboxRepository.createEvent({
        aggregateType: 'TransactionDraft',
        aggregateId: id,
        eventType: 'DRAFT_APPROVED',
        payload: { draftId: id }
      }, tx as any);

      return updatedDraft;
    });
  }
}
