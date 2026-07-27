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
import { VoucherBuilderModule } from '../voucher-builder/voucher-builder.module';
import { ContextModule } from '../../core/context/context.module';
import { isWorkerMode } from '../../shared/utils/runtime-mode';

import { ReviewController } from './api/review.controller';
import { BatchSyncController } from './api/batch-sync.controller';
import { ManualReviewController } from './api/manual-review.controller';
import { ERPConnectorModule } from '../erp-connector/erp-connector.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { EnterpriseAccountingIntelligenceModule } from '../accounting-intelligence/enterprise-accounting-intelligence.module';

const controllers = [
  OcrController,
  ReviewController,
  BatchSyncController,
  ManualReviewController,
];

const providers: any[] = [
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
  {
    provide: 'IVendorLedgerProfileRepository',
    useClass: PrismaVendorLedgerProfileRepository,
  },
];

if (isWorkerMode) {
  providers.push(VendorSlipWorker, BatchSyncWorker);
}

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'vendor-slip-queue',
    }),
    ContextModule,
    BullModule.registerQueue({
      name: 'batch-sync-queue',
    }),
    ERPConnectorModule,
    PrismaModule,
    EnterpriseAccountingIntelligenceModule,
  ],
  controllers: isWorkerMode ? [] : controllers,
  providers,
})
export class VendorSlipModule {}
