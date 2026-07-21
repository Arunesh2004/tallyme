import { Injectable, Inject } from '@nestjs/common';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
} from '../interfaces/student.repository.interface';
import { CreateStudentDto } from '../dto/student.dto';
import { Student } from '../entities/student.entity';
import { DuplicateAdmissionNumberException } from '../exceptions/student.exceptions';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class CreateStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly repository: IStudentRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(dto: CreateStudentDto): Promise<Student> {
    this.logger.debug(
      `Executing CreateStudentUseCase for ${dto.admissionNumber}`,
      'StudentDomain',
    );

    const existing = await this.repository.findByAdmissionNumber(
      dto.admissionNumber,
    );
    if (existing) {
      throw new DuplicateAdmissionNumberException(dto.admissionNumber);
    }

    const student = Student.create({
      admissionNumber: dto.admissionNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      email: dto.email || null,
      phone: dto.phone || null,
      guardianId: null,
    });

    await this.repository.save(student);

    this.logger.log(
      `Student created successfully: ${student.id}`,
      'StudentDomain',
    );
    // Domain Events would be dispatched here (e.g., StudentCreatedEvent)

    return student;
  }
}
