import { Module } from '@nestjs/common';
import { AccountingPolicyService } from './services/accounting-policy.service';
import { AccountingPeriodService } from './services/accounting-period.service';
import { AccountingPeriodController } from './controllers/accounting-period.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AccountingPeriodController],
  providers: [AccountingPolicyService, AccountingPeriodService],
  exports: [AccountingPolicyService, AccountingPeriodService],
})
export class AccountingPolicyModule {}
