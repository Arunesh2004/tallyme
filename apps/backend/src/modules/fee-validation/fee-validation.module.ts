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

import { isWorkerMode } from '../../shared/utils/runtime-mode';

const controllers = isWorkerMode ? [] : [ValidationController];
const providers: any[] = [
  {
    provide: VALIDATION_REPOSITORY,
    useClass: PrismaFeeValidationRepository,
  },
  FeeAllocationEngine,
  FeeValidationEngine,
  DuplicatePaymentRule,
  OverpaymentRule,
  ProcessValidationUseCase,
];

if (isWorkerMode) {
  providers.push(ValidationWorker);
}

@Module({
  imports: [
    BullModule.registerQueue({
      name: FEE_VALIDATION_QUEUE,
    }),
  ],
  controllers,
  providers,
})
export class FeeValidationModule {}
