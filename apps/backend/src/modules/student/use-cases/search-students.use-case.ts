import { Injectable, Inject } from '@nestjs/common';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
  PaginatedResult,
} from '../interfaces/student.repository.interface';
import { SearchStudentDto } from '../dto/student.dto';
import { Student } from '../entities/student.entity';

@Injectable()
export class SearchStudentsUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly repository: IStudentRepository,
  ) {}

  async execute(dto: SearchStudentDto): Promise<PaginatedResult<Student>> {
    const { page = 1, limit = 10, ...filters } = dto;
    return this.repository.search(filters, page, limit);
  }
}
