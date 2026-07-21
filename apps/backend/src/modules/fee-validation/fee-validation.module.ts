import { Module } from '@nestjs/common';
import {
  VALIDATION_REPOSITORY,
  FEE_VALIDATION_QUEUE,
} from './constants/validation.constants';
import { PrismaFeeValidationRepository } from './repositories/prisma-validation.repository';
import { FeeAllocationEngine } from './services/allocation.engine';
import { FeeValidationEngine } from './services/validation.engine';
import { DuplicatePaymentRule } from './rules/duplicate-payment.rule';
import { OverpaymentRule } from './rules/overpayment.rule';
import { ProcessValidationUseCase } from './use-cases/process-validation.use-case';
import { ValidationController } from './controllers/validation.controller';
import { ValidationWorker } from './queue/validation.worker';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: FEE_VALIDATION_QUEUE,
    }),
  ],
  controllers: [ValidationController],
  providers: [
    {
      provide: VALIDATION_REPOSITORY,
      useClass: PrismaFeeValidationRepository,
    },
    FeeAllocationEngine,
    FeeValidationEngine,
    DuplicatePaymentRule,
    OverpaymentRule,
    ProcessValidationUseCase,
    ValidationWorker,
  ],
})
export class FeeValidationModule {}
