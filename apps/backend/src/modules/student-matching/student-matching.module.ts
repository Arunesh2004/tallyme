import { Module } from '@nestjs/common';
import {
  MATCHING_REPOSITORY,
  STUDENT_MATCHING_QUEUE,
} from './constants/matching.constants';
import { PrismaMatchingRepository } from './repositories/prisma-matching.repository';
import { MatchingEngine } from './services/matching.engine';
import { ConflictDetector } from './services/conflict.detector';
import { AdmissionNumberRule } from './rules/admission-number.rule';
import { StudentNameRule } from './rules/student-name.rule';
import { ProcessMatchingUseCase } from './use-cases/process-matching.use-case';
import { MatchingController } from './controllers/matching.controller';
import { MatchingWorker } from './queue/matching.worker';
import { BullModule } from '@nestjs/bullmq';
import { StudentModule } from '../student/student.module';
import { PaymentParserModule } from '../payment-parser/payment-parser.module';

import { isWorkerMode } from '../../shared/utils/runtime-mode';

const controllers = isWorkerMode ? [] : [MatchingController];
const providers: any[] = [
  {
    provide: MATCHING_REPOSITORY,
    useClass: PrismaMatchingRepository,
  },
  MatchingEngine,
  ConflictDetector,
  AdmissionNumberRule,
  StudentNameRule,
  ProcessMatchingUseCase,
];

if (isWorkerMode) {
  providers.push(MatchingWorker);
}

@Module({
  imports: [
    StudentModule,
    PaymentParserModule,
    BullModule.registerQueue({
      name: STUDENT_MATCHING_QUEUE,
    }),
  ],
  controllers,
  providers,
})
export class StudentMatchingModule {}
