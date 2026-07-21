import { Injectable, Inject } from '@nestjs/common';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
} from '../interfaces/student.repository.interface';
import { UpdateStudentDto } from '../dto/student.dto';
import { Student } from '../entities/student.entity';
import { StudentNotFoundException } from '../exceptions/student.exceptions';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class UpdateStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly repository: IStudentRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(id: string, dto: UpdateStudentDto): Promise<Student> {
    this.logger.debug(
      `Executing UpdateStudentUseCase for ${id}`,
      'StudentDomain',
    );

    const student = await this.repository.findById(id);
    if (!student) {
      throw new StudentNotFoundException(id);
    }

    student.update({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
    });

    await this.repository.save(student);
    this.logger.log(
      `Student updated successfully: ${student.id}`,
      'StudentDomain',
    );

    return student;
  }
}
