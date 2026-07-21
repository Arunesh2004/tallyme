import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionManager } from './transaction.manager';
import { PrismaHealthIndicator } from './prisma.health';
import { MigrationService } from './migration';
import { SeedService } from './seed';

@Global()
@Module({
  providers: [
    PrismaService,
    TransactionManager,
    PrismaHealthIndicator,
    MigrationService,
    SeedService,
  ],
  exports: [PrismaService, TransactionManager, PrismaHealthIndicator],
})
export class PrismaModule {}
