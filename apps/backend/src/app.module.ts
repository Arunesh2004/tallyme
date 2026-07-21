import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
      ],
    }),
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
