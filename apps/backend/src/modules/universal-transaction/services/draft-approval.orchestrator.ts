import { Injectable } from '@nestjs/common';
import { TransactionDraftService } from './transaction-draft.service';
import { ActionDraftDto } from '../dto/transaction.dto';
import { TransactionDraft } from '@prisma/client';

@Injectable()
export class DraftApprovalOrchestrator {
  constructor(
    private readonly draftService: TransactionDraftService,
  ) {}

  async approveDraft(
    id: string,
    userId: string,
    userTenantId: string,
    dto: ActionDraftDto,
  ): Promise<TransactionDraft> {
    // 1. Core Domain: Approve Draft via Service (DB boundaries applied, Outbox event created)
    const approvedDraft = await this.draftService.approveDraft(
      id,
      userId,
      userTenantId,
      dto,
    );
    
    if (!approvedDraft) {
      throw new Error(`Draft ${id} not found or could not be approved`);
    }

    // 2. Dispatch logic has been migrated to Transactional Outbox pattern.
    // The outbox worker will pick up the DRAFT_APPROVED event asynchronously.

    return approvedDraft;
  }
}
