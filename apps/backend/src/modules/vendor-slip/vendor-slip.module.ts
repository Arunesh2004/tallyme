import { Module } from '@nestjs/common';
import { OcrController } from './api/ocr.controller';

import {
  OCRCoordinator,
  InvoiceExtractor,
  VendorMatcher,
  LedgerMapper,
  ExpenseAllocator,
  VoucherGenerator,
  ExpenseValidationPolicy,
} from './domain/services';

import { AzureOCRProvider } from '../document-processing/providers/azure-ocr.provider';
import { GeminiVisionOCRProvider } from '../document-processing/providers/gemini-vision-ocr.provider';
import { GeminiExtractionProvider } from '../document-processing/providers/gemini-extraction.provider';
import { GeminiClientService } from '../document-processing/providers/gemini-client.service';
import { ocrProviderFactory } from '../document-processing/ocr-provider.factory';
import { ConfigService } from '@nestjs/config';
import {
  PrismaVendorRepository,
  PrismaVendorLedgerProfileRepository,
} from './repositories/prisma-vendor.repository';
import { PrismaManualReviewRepository } from './repositories/prisma-manual-review.repository';
import { BullModule } from '@nestjs/bullmq';
import { VendorSlipWorker } from './queue/vendor-slip.worker';
import { BatchSyncWorker } from './queue/batch-sync.worker';
import { OcrWorker } from './queue/ocr.worker';
import { VoucherBuilderModule } from '../voucher-builder/voucher-builder.module';
import { ContextModule } from '../../core/context/context.module';
import { isWorkerMode } from '../../shared/utils/runtime-mode';

import { ReviewController } from './api/review.controller';
import { BatchSyncController } from './api/batch-sync.controller';
import { ManualReviewController } from './api/manual-review.controller';
import { ERPConnectorModule } from '../erp-connector/erp-connector.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { EnterpriseAccountingIntelligenceModule } from '../accounting-intelligence/enterprise-accounting-intelligence.module';
import { UniversalTransactionModule } from '../universal-transaction/universal-transaction.module';
import { VendorSlipDraftAdapter } from './application/vendor-slip-draft.adapter';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';
import { OcrPipelineService } from './services/ocr-pipeline.service';

// VMMS Imports
import { VmmsShadowExecutionService } from './vmms/application/vmms-shadow-execution.service';
import { VmmsActiveExecutionService } from './vmms/application/vmms-active-execution.service';
import { VmmsFeatureFlagService } from './vmms/config/vmms-feature-flag.service';
import { VmmsVendorMatcher } from './vmms/domain/services/vmms-matcher.service';
import { VmmsEvidenceBuilder } from './vmms/domain/services/vmms-evidence-builder';
import { GSTINNormalizer } from './vmms/domain/services/gstin-normalizer.service';
import { VmmsVendorMatchDecisionRepository } from './vmms/infrastructure/repositories/vmms-vendor-match-decision.repository';
import { VmmsVendorBranchRepository } from './vmms/infrastructure/repositories/vmms-vendor-branch.repository';
import { VmmsVendorLedgerRepository } from './vmms/infrastructure/repositories/vmms-vendor-ledger.repository';
import { VmmsAdminController } from './vmms/api/vmms-admin.controller';
import { VmmsAdminService } from './vmms/application/vmms-admin.service';
import { VmmsAdminRepository } from './vmms/infrastructure/repositories/vmms-admin.repository';
import { VmmsReviewController } from './vmms/api/vmms-review.controller';
import { VmmsReviewService } from './vmms/application/vmms-review.service';
import { VmmsReviewRepository } from './vmms/infrastructure/repositories/vmms-review.repository';
import { DocumentReviewController } from './api/document-review.controller';
import { DocumentReviewService } from './services/document-review.service';
import { DocumentClassificationService } from '../document-processing/services/document-classification.service';
import { PurchaseCompatibilityAdapter } from './application/purchase-compatibility.adapter';

const controllers = [
  OcrController,
  ReviewController,
  BatchSyncController,
  VmmsAdminController,
  VmmsReviewController,
  DocumentReviewController,
];

const providers: any[] = [
  OcrPipelineService,
  OCRCoordinator,
  InvoiceExtractor,
  VendorMatcher,
  LedgerMapper,
  ExpenseAllocator,
  VoucherGenerator,
  ExpenseValidationPolicy,
  GeminiClientService,
  AzureOCRProvider,
  GeminiVisionOCRProvider,
  ocrProviderFactory,
  {
    provide: 'AIExtractor',
    useClass: GeminiExtractionProvider,
  },
  {
    provide: 'IVendorRepository',
    useClass: PrismaVendorRepository,
  },
  PrismaVendorRepository,
  {
    provide: 'IVendorLedgerProfileRepository',
    useClass: PrismaVendorLedgerProfileRepository,
  },
  // VMMS Providers
  VmmsShadowExecutionService,
  VmmsActiveExecutionService,
  VmmsFeatureFlagService,
  VmmsVendorMatcher,
  VmmsEvidenceBuilder,
  GSTINNormalizer,
  VmmsVendorMatchDecisionRepository,
  VmmsVendorBranchRepository,
  VmmsVendorLedgerRepository,
  VmmsAdminService,
  VmmsAdminRepository,
  VmmsReviewService,
  VmmsReviewRepository,
  VendorSlipDraftAdapter,
  DocumentReviewService,
  DocumentClassificationService,
  PurchaseCompatibilityAdapter,
];

// Always load workers for UAT test
providers.push(VendorSlipWorker, BatchSyncWorker, OcrWorker);

import { MetricsModule } from '../../shared/observability/metrics/metrics.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'vendor-slip-queue',
    }),
    BullModule.registerQueue({
      name: 'batch-sync-queue',
    }),
    BullModule.registerQueue({
      name: 'ocr-queue',
    }),
    ContextModule,
    ERPConnectorModule,
    PrismaModule,
    EnterpriseAccountingIntelligenceModule,
    UniversalTransactionModule,
    MetricsModule,
    AuditModule,
    EventsModule,
  ],
  controllers: controllers,
  providers,
  exports: [
    PrismaVendorRepository,
    VmmsReviewService,
    DocumentClassificationService,
    PurchaseCompatibilityAdapter,
  ],
})
export class VendorSlipModule {}


