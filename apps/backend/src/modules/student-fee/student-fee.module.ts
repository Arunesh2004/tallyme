import { Module } from '@nestjs/common';
import { StudentManualReviewController } from './api/student-review.controller';
import { StudentTransactionsController } from './api/student-transactions.controller';
import {
  StudentVoucherOrchestrator,
  StudentVoucherMappingPolicy,
  StudentNarrationPolicy,
} from './domain/services/student-voucher.orchestrator';
import { PaymentExtractor, EmailParser } from './domain/services/payment-extractor.service';
import { PaymentIntelligenceEngine } from './intelligence/payment-intelligence.engine';

import { VoucherBuilderModule } from '../voucher-builder/voucher-builder.module';
import { StudentFeeWorker } from './queue/student-fee.worker';
import { MatchStudentCommandHandler } from './application';
import { StudentMatcher } from './domain/services/student-matching.service';
import { FeeAllocationService } from './domain/services/fee-allocation.service';
import { BullModule } from '@nestjs/bullmq';
import { isWorkerMode } from '../../shared/utils/runtime-mode';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { SharedCacheModule } from '../../shared/cache/cache.module';
import { StudentModule } from '../student/student.module'; // for STUDENT_REPOSITORY
import { ContextModule } from '../../core/context/context.module';
import { EnterpriseAccountingIntelligenceModule } from '../accounting-intelligence/enterprise-accounting-intelligence.module';
import { UniversalTransactionModule } from '../universal-transaction/universal-transaction.module';
import { StudentFeeDraftAdapter } from './application/student-fee-draft.adapter';

const controllers = isWorkerMode
  ? []
  : [StudentManualReviewController, StudentTransactionsController];

const providers: any[] = [
  StudentVoucherOrchestrator,
  StudentVoucherMappingPolicy,
  StudentNarrationPolicy,
  StudentMatcher,
  FeeAllocationService,
  MatchStudentCommandHandler,
  StudentFeeDraftAdapter,
  PaymentExtractor,
  EmailParser,
  PaymentIntelligenceEngine,
];

if (isWorkerMode) {
  providers.push(StudentFeeWorker);
}

@Module({
  imports: [
    VoucherBuilderModule,
    PrismaModule,
    SharedCacheModule,
    StudentModule,
    ContextModule,
    EnterpriseAccountingIntelligenceModule,
    UniversalTransactionModule,
    BullModule.registerQueue({
      name: 'payment-candidate-processing',
    }),
  ],
  controllers,
  providers,
  exports: [StudentVoucherOrchestrator],
})
export class StudentFeeModule {}
