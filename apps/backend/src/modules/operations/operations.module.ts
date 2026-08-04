import { Module } from '@nestjs/common';
import { CapabilityRegistryService } from './services/capability-registry.service';
import { AuditAggregatorService } from './services/audit-aggregator.service';

import { CapabilityController } from './controllers/capability.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ReviewQueueController as LegacyReviewQueueController } from './controllers/review-queue.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { SystemHealthController } from './controllers/system-health.controller';
import { AuditController } from './controllers/audit.controller';
import { AdminConfigController } from './controllers/admin-config.controller';

import { ReviewQueueController } from './review/review-queue.controller';
import { ReviewQueueService } from './review/review-queue.service';
import { TallyHealthController } from './controllers/tally-health.controller';
import { TallyHealthService } from '../erp-connector/services/tally-health.service';
import { AuditTimelineController } from './audit/audit-timeline.controller';
import { AuditTimelineService } from './audit/audit-timeline.service';
import { NotificationService } from './notification/notification.service';
import { ERPConnectorModule } from '../erp-connector/erp-connector.module';

import { TransactionsController } from './controllers/transactions.controller';
import { VendorsController } from './controllers/vendors.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { QueueController } from './controllers/queue.controller';
import { QueueModule } from '../../infrastructure/queue/bullmq.module';
import { ApprovalBatchService } from './approval-batch/approval-batch.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { EnterpriseAccountingIntelligenceModule } from '../accounting-intelligence/enterprise-accounting-intelligence.module';

@Module({
  imports: [ERPConnectorModule, QueueModule, PrismaModule, EnterpriseAccountingIntelligenceModule], // Required for TallyTransportService inside TallyHealthService
  controllers: [
    CapabilityController,
    DashboardController,
    LegacyReviewQueueController,
    MonitoringController,
    SystemHealthController,
    AuditController,
    AdminConfigController,
    ReviewQueueController,
    TallyHealthController,
    AuditTimelineController,
    TransactionsController,
    VendorsController,
    NotificationsController,
    QueueController,
  ],
  providers: [
    CapabilityRegistryService,
    AuditAggregatorService,
    ReviewQueueService,
    TallyHealthService,
    AuditTimelineService,
    NotificationService,
    ApprovalBatchService,
  ],
  exports: [ApprovalBatchService],
})
export class OperationsModule {}
