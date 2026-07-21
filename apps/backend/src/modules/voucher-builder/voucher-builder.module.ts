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
import { ProcessVoucherBuilderUseCase } from './use-cases/process-voucher-builder.use-case';
import { VoucherController } from './controllers/voucher.controller';
import { VoucherWorker } from './queue/voucher.worker';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: VOUCHER_BUILDER_QUEUE,
    }),
  ],
  controllers: [VoucherController],
  providers: [
    {
      provide: VOUCHER_REPOSITORY,
      useClass: PrismaVoucherRepository,
    },
    LedgerResolver,
    NarrationBuilder,
    ReferenceGenerator,
    VoucherValidator,
    VoucherBuilderEngine,
    ProcessVoucherBuilderUseCase,
    VoucherWorker,
  ],
})
export class VoucherBuilderModule {}
