import { Module } from '@nestjs/common';
import { TransactionDraftController } from './controllers/transaction-draft.controller';
import { TransactionDraftService } from './services/transaction-draft.service';
import { TransactionDraftRepository } from './repositories/transaction-draft.repository';
import { TransactionOutboxRepository } from './repositories/transaction-outbox.repository';
import { AccountingPolicyModule } from '../accounting-policy/accounting-policy.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { RedisModule } from '../../infrastructure/cache/redis.module';
import { DuplicateDetectionModule } from '../duplicate-detection/duplicate-detection.module';
import { ApprovalDispatchService } from './services/approval-dispatch.service';
import { DraftApprovalOrchestrator } from './services/draft-approval.orchestrator';
import { OutboxRelayWorker } from './workers/outbox-relay.worker';
import { OutboxCleanupWorker } from './workers/outbox-cleanup.worker';
import { OutboxRecoverySweeper } from './workers/outbox-recovery.worker';
import { VoucherReadinessEngine } from './services/voucher-readiness.engine';
import { TransactionAdminController } from './controllers/transaction-admin.controller';
import { BullModule } from '@nestjs/bullmq';
import { VOUCHER_BUILDER_QUEUE } from '../voucher-builder/constants/voucher.constants';
import { ObservabilityModule } from '../../shared/observability/observability.module';
import { AuditModule } from '../audit/audit.module';
import { EnterpriseAccountingIntelligenceModule } from '../accounting-intelligence/enterprise-accounting-intelligence.module';

@Module({
  imports: [
    AccountingPolicyModule, 
    DuplicateDetectionModule, 
    PrismaModule, 
    RedisModule,
    EnterpriseAccountingIntelligenceModule,
    BullModule.registerQueue({
      name: VOUCHER_BUILDER_QUEUE,
    }),
    ObservabilityModule,
    AuditModule,
  ],
  controllers: [TransactionDraftController, TransactionAdminController],
  providers: [
    TransactionDraftService,
    TransactionDraftRepository,
    TransactionOutboxRepository,
    ApprovalDispatchService,
    DraftApprovalOrchestrator,
    OutboxRelayWorker,
    OutboxCleanupWorker,
    OutboxRecoverySweeper,
    VoucherReadinessEngine,
  ],
  exports: [
    TransactionDraftService,
    DraftApprovalOrchestrator,
    TransactionOutboxRepository,
  ],
})
export class UniversalTransactionModule {}
