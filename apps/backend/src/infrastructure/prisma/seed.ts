import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Seed Infrastructure
 * Framework for running foundational setup scripts (e.g. default roles, global configurations).
 * Does not insert production transactional data or feature entities.
 */
@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async runSeeds(): Promise<void> {
    // Placeholder for structural seeds executed via CLI
    console.log('Running foundational seeds (No-op)');
  }
}
