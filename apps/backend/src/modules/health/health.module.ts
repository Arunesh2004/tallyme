import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ERPConnectorModule } from '../erp-connector/erp-connector.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

import { isWorkerMode } from '../../shared/utils/runtime-mode';

@Module({
  imports: [TerminusModule, ERPConnectorModule, PrismaModule],
  controllers: isWorkerMode ? [] : [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
