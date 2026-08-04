import { Module } from '@nestjs/common';
import {
  VOUCHER_REPOSITORY,
  VOUCHER_BUILDER_QUEUE,
} from './constants/voucher.constants';
import { PrismaVoucherRepository } from './repositories/prisma-voucher.repository';
import { LedgerResolver } from './services/ledger.resolver';
import { NarrationBuilder } from './services/narration.builder';
import { ReferenceGenerator } from './services/reference.generator';
import { VoucherValidator } from './services/voucher.validator';
import { VoucherBuilderEngine } from './services/voucher-builder.engine';
import { VoucherStrategyFactory } from './services/strategies/voucher.strategy.factory';
import { ReceiptStrategy } from './services/strategies/receipt.strategy';
import { PurchaseStrategy } from './services/strategies/purchase.strategy';
import { ProcessVoucherBuilderUseCase } from './use-cases/process-voucher-builder.use-case';
import { VoucherController } from './controllers/voucher.controller';
import { VoucherWorker } from './queue/voucher.worker';
import { BullModule } from '@nestjs/bullmq';
import { VoucherCleanupWorker } from './workers/voucher-cleanup.worker';
import { ObservabilityModule } from '../../shared/observability/observability.module';

import { AccountingPolicyModule } from '../accounting-policy/accounting-policy.module';

import { isWorkerMode } from '../../shared/utils/runtime-mode';

const controllers = [VoucherController];
const providers: any[] = [
  {
    provide: VOUCHER_REPOSITORY,
    useClass: PrismaVoucherRepository,
  },
  LedgerResolver,
  VoucherCleanupWorker,
  NarrationBuilder,
  ReferenceGenerator,
  VoucherValidator,
  VoucherBuilderEngine,
  VoucherStrategyFactory,
  ReceiptStrategy,
  PurchaseStrategy,
  ProcessVoucherBuilderUseCase,
];

// Always load VoucherWorker
providers.push(VoucherWorker);

@Module({
  imports: [
    BullModule.registerQueue({
      name: VOUCHER_BUILDER_QUEUE,
    }),
    ObservabilityModule,
    AccountingPolicyModule,
  ],
  controllers,
  providers,
})
export class VoucherBuilderModule {}
