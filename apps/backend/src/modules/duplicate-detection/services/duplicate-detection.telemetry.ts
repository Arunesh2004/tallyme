import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { DuplicateClassification } from '@prisma/client';

@Injectable()
export class DuplicateDetectionTelemetry {
  private readonly logger = new Logger(DuplicateDetectionTelemetry.name);

  constructor(
    @InjectMetric('duplicate_detection_requests_total')
    private readonly requestsTotal: Counter<string>,
    @InjectMetric('duplicate_detection_duration_ms')
    private readonly durationMs: Histogram<string>,
    @InjectMetric('duplicate_detection_cache_hit_total')
    private readonly cacheHitTotal: Counter<string>,
    @InjectMetric('duplicate_detection_cache_miss_total')
    private readonly cacheMissTotal: Counter<string>,
    @InjectMetric('duplicate_detection_provider_failures_total')
    private readonly providerFailuresTotal: Counter<string>,
    @InjectMetric('duplicate_detection_timeouts_total')
    private readonly timeoutsTotal: Counter<string>,
  ) {}

  recordRequest(provider: string, classification: DuplicateClassification, fallbackUsed: boolean, duration: number) {
    try {
      this.requestsTotal.labels(provider, classification, String(fallbackUsed)).inc();
      this.durationMs.labels(provider, classification, String(fallbackUsed)).observe(duration);
    } catch (e) {
      this.logger.error(`Failed to record metrics: ${(e as Error).message}`);
    }
  }

  recordCacheHit() {
    try { this.cacheHitTotal.inc(); } catch (e) {}
  }

  recordCacheMiss() {
    try { this.cacheMissTotal.inc(); } catch (e) {}
  }

  recordProviderFailure(provider: string) {
    try { this.providerFailuresTotal.labels(provider).inc(); } catch (e) {}
  }

  recordTimeout(provider: string) {
    try { this.timeoutsTotal.labels(provider).inc(); } catch (e) {}
  }
}
