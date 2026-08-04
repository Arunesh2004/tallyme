import { Module, forwardRef } from '@nestjs/common';
import {
  ERP_REPOSITORY,
  ERP_SYNC_QUEUE,
  VOUCHER_REPOSITORY,
} from './constants/erp.constants';
import { PrismaERPRepository } from './repositories/prisma-erp.repository';
import { PrismaVoucherCandidateRepository } from './repositories/prisma-voucher-candidate.repository';
import { TallyPrimeAdapter } from './adapters/tally-prime.adapter';
import { ERPAdapterFactory } from './services/adapter.factory';
import { ERPConnectionManager } from './services/connection.manager';
import { ERPPayloadBuilder } from './services/payload.builder';
import { ERPResponseParser } from './services/response.parser';
import { ERPHealthService } from './services/health.service';
import { ERPRetryService } from './services/retry.service';
import { ReconciliationService } from './services/reconciliation.service';
import { ERPReconciliationWorker } from './workers/erp-reconciliation.worker';
import { ERPConnectorEngine } from './services/connector.engine';
import { ProcessERPSyncUseCase } from './use-cases/process-erp-sync.use-case';
import { ERPController } from './controllers/erp.controller';
import { TallyOrganizationController } from './controllers/tally-organization.controller';
import { ERPSyncWorker } from './queue/erp-sync.worker';
import { BullModule } from '@nestjs/bullmq';
import { TallyXmlBuilderService } from './services/xml-builder.service';
import { VoucherMapperService } from './services/voucher-mapper.service';
import { TallyTransportService } from './services/transport.service';
import { TallyXmlParserService } from './services/xml-parser.service';
import { ERPIdempotencyService } from './services/idempotency.service';
import { VerifyERPSyncUseCase } from './use-cases/verify-erp-sync.use-case';
import { ERPVerifyWorker } from './queue/erp-verify.worker';
import { ConfigCompanyResolver } from './services/company-resolver.service';
import { TallyMasterXmlBuilder } from './services/tally-master-xml.builder';
import { TallyMasterIntelligenceService } from './services/tally-master-intelligence.service';
import { TallyDiscoveryAdapter } from './services/tally-discovery.adapter';
import { EnterpriseAccountingIntelligenceModule } from '../accounting-intelligence/enterprise-accounting-intelligence.module';
import { TallyERPManagementAdapter } from './infrastructure/tally/tally-master-management.adapter';
import { TallyCircuitBreakerService } from './services/circuit-breaker.service';

import { isWorkerMode } from '../../shared/utils/runtime-mode';
import { UniversalTransactionModule } from '../universal-transaction/universal-transaction.module';
import { ObservabilityModule } from '../../shared/observability/observability.module';
import { AccountingPolicyModule } from '../accounting-policy/accounting-policy.module';

const controllers = isWorkerMode
  ? []
  : [ERPController, TallyOrganizationController];
const providers: any[] = [
  {
    provide: ERP_REPOSITORY,
    useClass: PrismaERPRepository,
  },
  PrismaERPRepository,
  {
    provide: VOUCHER_REPOSITORY,
    useClass: PrismaVoucherCandidateRepository,
  },
  ConfigCompanyResolver,
  TallyTransportService,
  VoucherMapperService,
  TallyXmlBuilderService,
  TallyXmlParserService,
  TallyPrimeAdapter,
  ERPAdapterFactory,
  ERPConnectionManager,
  ERPPayloadBuilder,
  ERPResponseParser,
  ERPHealthService,
  ERPRetryService,
  ERPIdempotencyService,
  ERPConnectorEngine,
  ProcessERPSyncUseCase,
  VerifyERPSyncUseCase,
  TallyMasterXmlBuilder,
  TallyMasterIntelligenceService,
  TallyDiscoveryAdapter,
  TallyERPManagementAdapter,
  TallyCircuitBreakerService,
  ReconciliationService,
];

// Always load workers for UAT test
providers.push(ERPSyncWorker, ERPVerifyWorker, ERPReconciliationWorker);

@Module({
  imports: [
    BullModule.registerQueue({
      name: ERP_SYNC_QUEUE,
    }),
    BullModule.registerQueue({
      name: 'erp-verify-queue',
    }),
    forwardRef(() => EnterpriseAccountingIntelligenceModule),
    forwardRef(() => UniversalTransactionModule),
    ObservabilityModule,
    AccountingPolicyModule,
  ],
  controllers,
  providers,
  exports: [
    TallyMasterIntelligenceService,
    ERPReconciliationWorker,
    TallyTransportService,
    TallyDiscoveryAdapter,
    TallyERPManagementAdapter,
    ERP_REPOSITORY,
    VOUCHER_REPOSITORY,
    PrismaERPRepository,
  ],
})
export class ERPConnectorModule {}
