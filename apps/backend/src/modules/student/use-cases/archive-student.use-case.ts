import { Injectable, Inject } from '@nestjs/common';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
} from '../interfaces/student.repository.interface';
import { StudentNotFoundException } from '../exceptions/student.exceptions';
import { LoggerService } from '../../../core/logger/logger.service';
import { CACHE_MANAGER } from '../../../shared/cache/cache.constants';
import { ICacheManager } from '../../../shared/cache/cache.interfaces';
import { CacheKeyBuilder } from '../../../shared/cache/cache.service';

@Injectable()
export class ArchiveStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly repository: IStudentRepository,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cache: ICacheManager,
    private readonly keyBuilder: CacheKeyBuilder,
  ) {}

  async execute(id: string): Promise<void> {
    const student = await this.repository.findById(id);
    if (!student) {
      throw new StudentNotFoundException(id);
    }

    student.archive();
    await this.repository.save(student);

    // Invalidate cache
    const cacheKey = this.keyBuilder.build('student', id);
    await this.cache.del(cacheKey);

    this.logger.log(`Student archived successfully: ${id}`, 'StudentDomain');
  }
}
