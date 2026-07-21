import { Injectable, Inject } from '@nestjs/common';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
} from '../interfaces/student.repository.interface';
import { Student } from '../entities/student.entity';
import { StudentNotFoundException } from '../exceptions/student.exceptions';
import { CACHE_MANAGER } from '../../../shared/cache/cache.constants';
import { ICacheManager } from '../../../shared/cache/cache.interfaces';
import { CacheKeyBuilder } from '../../../shared/cache/cache.service';

@Injectable()
export class GetStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly repository: IStudentRepository,
    @Inject(CACHE_MANAGER) private readonly cache: ICacheManager,
    private readonly keyBuilder: CacheKeyBuilder,
  ) {}

  async execute(id: string): Promise<Student> {
    const cacheKey = this.keyBuilder.build('student', id);
    const cached = await this.cache.get<Student>(cacheKey);

    // Simplification for abstraction: real caching might require reconstituting Student from cached props
    if (cached) {
      return Student.reconstitute(cached as any);
    }

    const student = await this.repository.findById(id);
    if (!student) {
      throw new StudentNotFoundException(id);
    }

    await this.cache.set(cacheKey, student.getProps(), 3600); // 1 hour TTL
    return student;
  }
}
