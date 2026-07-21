import { Module } from '@nestjs/common';
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
import { ERPConnectorEngine } from './services/connector.engine';
import { ProcessERPSyncUseCase } from './use-cases/process-erp-sync.use-case';
import { ERPController } from './controllers/erp.controller';
import { ERPSyncWorker } from './queue/erp-sync.worker';
import { BullModule } from '@nestjs/bullmq';
import { TallyXmlBuilderService } from './services/xml-builder.service';
import { VoucherMapperService } from './services/voucher-mapper.service';
import { TallyTransportService } from './services/transport.service';
import { TallyXmlParserService } from './services/xml-parser.service';
import { ERPIdempotencyService } from './services/idempotency.service';
import { VerifyERPSyncUseCase } from './use-cases/verify-erp-sync.use-case';
import { ERPVerifyWorker } from './queue/erp-verify.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ERP_SYNC_QUEUE,
    }),
    BullModule.registerQueue({
      name: 'erp-verify-queue',
    }),
  ],
  controllers: [ERPController],
  providers: [
    {
      provide: ERP_REPOSITORY,
      useClass: PrismaERPRepository,
    },
    {
      provide: VOUCHER_REPOSITORY,
      useClass: PrismaVoucherCandidateRepository,
    },
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
    ERPSyncWorker,
    ERPVerifyWorker,
  ],
})
export class ERPConnectorModule {}
