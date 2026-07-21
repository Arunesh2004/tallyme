import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPrismaClient } from './prisma.client';
import { withExtensions, ExtendedPrismaClient } from './prisma.extensions';
import { DatabaseConfig } from '../../shared/config/database.config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private rawClient: any; // Type as PrismaClient when fully generating
  public readonly client: ExtendedPrismaClient;

  constructor(private readonly configService: ConfigService) {
    const dbConfig = this.configService.get<DatabaseConfig>('database');
    if (!dbConfig?.url) {
      throw new Error('Database URL is not configured.');
    }

    this.rawClient = getPrismaClient(dbConfig.url);
    this.client = withExtensions(this.rawClient);
  }

  async onModuleInit() {
    await this.rawClient.$connect();
  }

  async onModuleDestroy() {
    await this.rawClient.$disconnect();
  }
}
