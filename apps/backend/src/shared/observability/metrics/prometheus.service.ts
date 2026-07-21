// src/shared/observability/metrics/prometheus.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly registry = new client.Registry();

  public readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  public readonly businessVouchersGenerated = new client.Counter({
    name: 'tallyme_vouchers_generated_total',
    help: 'Total number of vouchers successfully generated'
  });

  public readonly erpSyncSuccessRate = new client.Counter({
    name: 'tallyme_erp_sync_success_total',
    help: 'Total number of successful ERP syncs'
  });

  public readonly erpSyncFailureRate = new client.Counter({
    name: 'tallyme_erp_sync_failure_total',
    help: 'Total number of failed ERP syncs',
    labelNames: ['reason']
  });

  public readonly manualReviewCount = new client.Counter({
    name: 'tallyme_manual_review_total',
    help: 'Total number of items routed to manual review',
    labelNames: ['module', 'reason']
  });

  onModuleInit() {
    client.collectDefaultMetrics({ register: this.registry });
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.businessVouchersGenerated);
    this.registry.registerMetric(this.erpSyncSuccessRate);
    this.registry.registerMetric(this.erpSyncFailureRate);
    this.registry.registerMetric(this.manualReviewCount);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
