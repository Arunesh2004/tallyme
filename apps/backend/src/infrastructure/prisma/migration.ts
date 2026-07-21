import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Migration Infrastructure
 * Note: Actual migrations are run via CLI (`npx prisma migrate deploy`).
 * This service is reserved for programmatic migration tracking or seed verification
 * when deploying in highly isolated CI/CD environments.
 */
@Injectable()
export class MigrationService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestMigration(): Promise<string | null> {
    try {
      const result: any[] = await this.prisma.client
        .$queryRaw`SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1`;
      return result.length > 0 ? result[0].migration_name : null;
    } catch (e) {
      return null;
    }
  }
}
