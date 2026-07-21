import { Module } from '@nestjs/common';
import { DashboardController } from './api/dashboard.controller';
import { ErpSyncPortalController } from './api/erp-sync-portal.controller';

@Module({
  controllers: [DashboardController, ErpSyncPortalController],
})
export class OperationsPortalModule {}
