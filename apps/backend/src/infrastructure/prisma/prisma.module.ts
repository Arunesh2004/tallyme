import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionManager } from './transaction.manager';
import { PrismaHealthIndicator } from './prisma.health';
import { MigrationService } from './migration.ts';
import { SeedService } from './seed.ts';

@Global()
@Module({
  providers: [
    PrismaService,
    TransactionManager,
    PrismaHealthIndicator,
    MigrationService,
    SeedService
  ],
  exports: [
    PrismaService,
    TransactionManager,
    PrismaHealthIndicator
  ]
})
export class PrismaModule {}
