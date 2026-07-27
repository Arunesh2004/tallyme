import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      Logger.warn(
        'Database unavailable at startup. Will attempt to reconnect on first query.',
        'PrismaService',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

