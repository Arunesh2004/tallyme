import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { TallyDiscoveryService } from './tally-discovery/tally-discovery.service';
// import { MigrationPlannerService } from './migration/migration-planner.service';
import { AccountingDecisionAuditService } from './decision-audit/accounting-decision-audit.service';
import { VendorIntelligenceService } from './workflows/vendor-intelligence.service';
import { StudentIntelligenceService } from './workflows/student-intelligence.service';
import { LedgerMappingEngine } from './ledger-mapping/ledger-mapping.engine';
import { AccountingRulesEngine } from './rules-engine/accounting-rules.engine';
import { TallyDiscoveryController } from './tally-discovery/tally-discovery.controller';
import { ERPConnectorModule } from '../erp-connector/erp-connector.module';
import { TallyMasterValidationEngine } from './validation/tally-master-validation.engine';
import { ApprovalWorkflowEngine } from './governance/approval-workflow.engine';
import { BulkApprovalService } from './governance/bulk-approval.service';
import { BullModule } from '@nestjs/bullmq';
import { AccountingTemplateEngine } from './template-engine/accounting-template.engine';
import { ApprovalController } from './governance/approval.controller';
// import { TallyStructureAnalyzerService } from './tally-analysis/tally-structure-analyzer.service';
// import { TemplateValidatorService } from './tally-analysis/template-validator.service';
// import { MigrationApprovalService } from './migration/migration-approval.service';
// import { RollbackValidatorService } from './migration/rollback-validator.service';
// import { MigrationController } from './migration/migration.controller';
// import { MigrationExecutionService } from './migration-execution/migration-execution.service';
// import { MigrationExecutionWorker } from './migration-execution/migration-execution.worker';
// import { RollbackExecutionService } from './rollback/rollback-execution.service';

import { DecisionAuditController } from './decision-audit/decision-audit.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ERPConnectorModule),
    BullModule.registerQueue({
      name: 'tally-migration-execution',
    }),
    BullModule.registerQueue({
      name: 'tally-rollback-execution',
    }),
  ],
  controllers: [
    ApprovalController,
    TallyDiscoveryController,
    // MigrationController,
    DecisionAuditController,
  ],
  providers: [
    TallyDiscoveryService,
    AccountingDecisionAuditService,
    VendorIntelligenceService,
    StudentIntelligenceService,
    LedgerMappingEngine,
    AccountingRulesEngine,
    TallyMasterValidationEngine,
    ApprovalWorkflowEngine,
    BulkApprovalService,
    AccountingTemplateEngine,
  ],
  exports: [
    TallyDiscoveryService,
    AccountingDecisionAuditService,
    VendorIntelligenceService,
    StudentIntelligenceService,
    LedgerMappingEngine,
    AccountingRulesEngine,
    TallyMasterValidationEngine,
    ApprovalWorkflowEngine,
    BulkApprovalService,
    AccountingTemplateEngine,
  ],
})
export class EnterpriseAccountingIntelligenceModule {}
