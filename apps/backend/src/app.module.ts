import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  appConfig,
  loggerConfig,
  databaseConfig,
  redisConfig,
  queueConfig,
  authConfig,
  jwtConfig,
  securityConfig,
  mailConfig,
  validateEnv,
} from './core/config';
import { aiConfig } from './shared/config/ai.config';
import { LoggerModule } from './core/logger/logger.module';
import { ContextModule } from './core/context/context.module';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { QueueModule } from './infrastructure/queue/bullmq.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { SharedCacheModule } from './shared/cache/cache.module';
import { StudentModule } from './modules/student/student.module';
import { MailModule } from './modules/mail/mail.module';
import { PaymentParserModule } from './modules/payment-parser/payment-parser.module';
import { StudentMatchingModule } from './modules/student-matching/student-matching.module';
import { FeeValidationModule } from './modules/fee-validation/fee-validation.module';
import { VoucherBuilderModule } from './modules/voucher-builder/voucher-builder.module';
import { ERPConnectorModule } from './modules/erp-connector/erp-connector.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { VendorSlipModule } from './modules/vendor-slip/vendor-slip.module';
// import { StudentFeeModule } from './modules/student-fee/student-fee.module';
import { OperationsModule } from './modules/operations/operations.module';
import { FilesModule } from './modules/files/files.module';
// import { EnterpriseAccountingIntelligenceModule } from './modules/accounting-intelligence/enterprise-accounting-intelligence.module';

import { OrganizationModule } from './modules/organization/organization.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsModule } from './modules/events/events.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupModule } from './modules/backup/backup.module';
import { AIGovernanceModule } from './modules/ai-governance/ai-governance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      load: [
        appConfig,
        loggerConfig,
        databaseConfig,
        redisConfig,
        queueConfig,
        authConfig,
        jwtConfig,
        securityConfig,
        mailConfig,
        aiConfig,
      ],
    }),
    PrometheusModule.register(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    LoggerModule,
    ContextModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    HealthModule,
    SharedCacheModule,
    StudentModule,
    MailModule,
    PaymentParserModule,
    StudentMatchingModule,
    FeeValidationModule,
    VoucherBuilderModule,
    ERPConnectorModule,
    OperationsModule,
    ObservabilityModule,
    VendorSlipModule,
    // StudentFeeModule,
    FilesModule,
    // EnterpriseAccountingIntelligenceModule,
    EventsModule,
    OrganizationModule,
    AuditModule,
    ScheduleModule.forRoot(),
    BackupModule,
    AIGovernanceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
