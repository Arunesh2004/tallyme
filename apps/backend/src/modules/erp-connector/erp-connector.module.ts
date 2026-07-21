import { Module } from '@nestjs/common';
import { ERP_REPOSITORY, ERP_SYNC_QUEUE } from './constants/erp.constants';
import { PrismaERPRepository } from './repositories/prisma-erp.repository';
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

@Module({
  imports: [
    BullModule.registerQueue({
      name: ERP_SYNC_QUEUE,
    }),
  ],
  controllers: [ERPController],
  providers: [
    {
      provide: ERP_REPOSITORY,
      useClass: PrismaERPRepository,
    },
    TallyPrimeAdapter,
    ERPAdapterFactory,
    ERPConnectionManager,
    ERPPayloadBuilder,
    ERPResponseParser,
    ERPHealthService,
    ERPRetryService,
    ERPConnectorEngine,
    ProcessERPSyncUseCase,
    ERPSyncWorker,
  ],
})
export class ERPConnectorModule {}
