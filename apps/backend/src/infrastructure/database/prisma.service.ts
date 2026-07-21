import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../core/logger/logger.service';
import { DatabaseConnectionException } from '../../common/exceptions/infrastructure.exceptions';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const url = configService.get<string>('database.url');
    super({
      datasources: {
        db: {
          url,
        },
      },
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        'Successfully established connection to PostgreSQL',
        'PrismaService',
      );
    } catch (error) {
      this.logger.error(
        'Failed to establish connection to PostgreSQL',
        (error as Error).stack,
        'PrismaService',
      );
      throw new DatabaseConnectionException(
        'Could not connect to database at startup',
        error as Error,
      );
    }
  }

  async onModuleDestroy() {
    this.logger.log(
      'Gracefully closing PostgreSQL connection',
      'PrismaService',
    );
    await this.$disconnect();
  }
}
