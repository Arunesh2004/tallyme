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

@Module({
  imports: [
    StudentModule,
    PaymentParserModule,
    BullModule.registerQueue({
      name: STUDENT_MATCHING_QUEUE,
    }),
  ],
  controllers: [MatchingController],
  providers: [
    {
      provide: MATCHING_REPOSITORY,
      useClass: PrismaMatchingRepository,
    },
    MatchingEngine,
    ConflictDetector,
    AdmissionNumberRule,
    StudentNameRule,
    ProcessMatchingUseCase,
    MatchingWorker,
  ],
})
export class StudentMatchingModule {}
