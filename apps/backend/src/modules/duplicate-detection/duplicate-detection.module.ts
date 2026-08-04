import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../infrastructure/cache/redis.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { RuleBasedProvider } from './providers/rule-based.provider';
import { PrismaFingerprintRepository } from './repositories/prisma-fingerprint.repository';
import { DUPLICATE_DETECTION_PROVIDER, FINGERPRINT_REPOSITORY } from './duplicate-detection.tokens';
import { DuplicateDetectionTelemetry } from './services/duplicate-detection.telemetry';
import { FingerprintFactory } from './factories/fingerprint.factory';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

const metricProviders = [
  makeCounterProvider({
    name: 'duplicate_detection_requests_total',
    help: 'Total number of duplicate detection requests evaluated',
    labelNames: ['provider', 'classification', 'fallbackUsed']
  }),
  makeHistogramProvider({
    name: 'duplicate_detection_duration_ms',
    help: 'Latency of duplicate detection in milliseconds',
    labelNames: ['provider', 'classification', 'fallbackUsed'],
    buckets: [10, 50, 100, 250, 500, 1000]
  }),
  makeCounterProvider({
    name: 'duplicate_detection_cache_hit_total',
    help: 'Total policy cache hits'
  }),
  makeCounterProvider({
    name: 'duplicate_detection_cache_miss_total',
    help: 'Total policy cache misses'
  }),
  makeCounterProvider({
    name: 'duplicate_detection_provider_failures_total',
    help: 'Total provider crash/exceptions',
    labelNames: ['provider']
  }),
  makeCounterProvider({
    name: 'duplicate_detection_timeouts_total',
    help: 'Total provider timeouts',
    labelNames: ['provider']
  })
];

@Module({
  imports: [ConfigModule, RedisModule, PrismaModule],
  providers: [
    DuplicateDetectionService,
    DuplicateDetectionTelemetry,
    FingerprintFactory,
    ...metricProviders,
    {
      provide: DUPLICATE_DETECTION_PROVIDER,
      useClass: RuleBasedProvider
    },
    {
      provide: FINGERPRINT_REPOSITORY,
      useClass: PrismaFingerprintRepository
    }
  ],
  exports: [DuplicateDetectionService]
})
export class DuplicateDetectionModule {}
