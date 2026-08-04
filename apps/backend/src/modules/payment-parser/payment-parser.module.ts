import { Module } from '@nestjs/common';
import {
  PAYMENT_PARSER_REPOSITORY,
  PAYMENT_CANDIDATE_QUEUE,
} from './constants/parser.constants';
import { PrismaParserRepository } from './repositories/prisma-parser.repository';
import { ConfidenceEngine } from './services/confidence.engine';
import { FieldNormalizer } from './services/field.normalizer';
import { DuplicatePreCheck } from './services/duplicate.pre-check';
import { GatewayDetector } from './services/gateway.detector';
import { ParserSelector } from './services/parser.selector';
import { RazorpayParser } from './parsers/razorpay.parser';
import { GenericParser } from './parsers/generic.parser';
import { ProcessPaymentEmailUseCase } from './use-cases/process-payment-email.use-case';
import { PaymentParserController } from './controllers/parser.controller';

import { BullModule } from '@nestjs/bullmq';

import { isWorkerMode } from '../../shared/utils/runtime-mode';
import { StudentPaymentExtractor } from './services/student-payment.extractor';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PAYMENT_CANDIDATE_QUEUE,
    }),
    PrismaModule,
  ],
  controllers: isWorkerMode ? [] : [PaymentParserController],
  providers: [
    {
      provide: PAYMENT_PARSER_REPOSITORY,
      useClass: PrismaParserRepository,
    },
    ConfidenceEngine,
    FieldNormalizer,
    DuplicatePreCheck,
    GatewayDetector,
    ParserSelector,
    RazorpayParser,
    GenericParser,
    ProcessPaymentEmailUseCase,
    StudentPaymentExtractor,
  ],
  exports: [PAYMENT_PARSER_REPOSITORY, ProcessPaymentEmailUseCase, StudentPaymentExtractor, RazorpayParser],
})
export class PaymentParserModule {}
