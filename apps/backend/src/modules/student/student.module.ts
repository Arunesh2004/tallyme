import { Module } from '@nestjs/common';
import { StudentController } from './controllers/student.controller';
import { StudentImportController } from './controllers/student-import.controller';
import { STUDENT_REPOSITORY } from './interfaces/student.repository.interface';
import { PrismaStudentRepository } from './repositories/prisma-student.repository';
import {
  CreateStudentUseCase,
  UpdateStudentUseCase,
  GetStudentUseCase,
  SearchStudentsUseCase,
  ArchiveStudentUseCase,
} from './use-cases';

import { isWorkerMode } from '../../shared/utils/runtime-mode';

@Module({
  controllers: isWorkerMode ? [] : [StudentController, StudentImportController],
  providers: [
    {
      provide: STUDENT_REPOSITORY,
      useClass: PrismaStudentRepository,
    },
    CreateStudentUseCase,
    UpdateStudentUseCase,
    GetStudentUseCase,
    SearchStudentsUseCase,
    ArchiveStudentUseCase,
  ],
  exports: [STUDENT_REPOSITORY, GetStudentUseCase],
})
export class StudentModule {}
