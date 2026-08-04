import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { MetricsModule } from '../../shared/observability/metrics/metrics.module';

import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [PrismaModule, MetricsModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
