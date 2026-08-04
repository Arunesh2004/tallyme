import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class PrometheusService {
  constructor(
    @InjectMetric('tallyme_vendor_docs_processed_total')
    public readonly vendorDocsProcessed: Counter<string>,

    @InjectMetric('tallyme_student_payments_processed_total')
    public readonly studentPaymentsProcessed: Counter<string>,

    @InjectMetric('tallyme_erp_sync_success_total')
    public readonly erpSyncSuccess: Counter<string>,

    @InjectMetric('tallyme_erp_sync_failure_total')
    public readonly erpSyncFailure: Counter<string>,

    @InjectMetric('tallyme_manual_review_total')
    public readonly manualReviews: Counter<string>,

    @InjectMetric('tallyme_voucher_generation_latency_seconds')
    public readonly voucherLatency: Histogram<string>,

    @InjectMetric('tallyme_ocr_confidence')
    public readonly ocrConfidence: Histogram<string>,

    @InjectMetric('tallyme_queue_active_jobs')
    public readonly queueActiveJobs: Counter<string>,

    @InjectMetric('tallyme_queue_failed_jobs')
    public readonly queueFailedJobs: Counter<string>,

    @InjectMetric('outbox_pending_total')
    public readonly outboxPendingTotal: Counter<string>,

    @InjectMetric('outbox_failed_total')
    public readonly outboxFailedTotal: Counter<string>,

    @InjectMetric('outbox_dead_total')
    public readonly outboxDeadTotal: Counter<string>,

    @InjectMetric('cleanup_deleted_total')
    public readonly cleanupDeletedTotal: Counter<string>,

    @InjectMetric('reconciliation_total')
    public readonly reconciliationTotal: Counter<string>,

    @InjectMetric('draft_failed_total')
    public readonly draftFailedTotal: Counter<string>,

    @InjectMetric('retry_total')
    public readonly retryTotal: Counter<string>,

    @InjectMetric('relay_processing_seconds')
    public readonly relayProcessingSeconds: Histogram<string>,

    @InjectMetric('voucher_build_seconds')
    public readonly voucherBuildSeconds: Histogram<string>,

    @InjectMetric('erp_sync_seconds')
    public readonly erpSyncSeconds: Histogram<string>,

    @InjectMetric('audit_drop_total')
    public readonly auditDropTotal: Counter<string>,

    @InjectMetric('cron_lock_acquired_total')
    public readonly cronLockAcquiredTotal: Counter<string>,

    @InjectMetric('cron_lock_failed_total')
    public readonly cronLockFailedTotal: Counter<string>,

    @InjectMetric('cron_lock_contention_total')
    public readonly cronLockContentionTotal: Counter<string>,
  ) {}

  incrementVendorDocs() {
    this.vendorDocsProcessed.inc();
  }

  recordOcrConfidence(confidence: number) {
    this.ocrConfidence.observe(confidence);
  }

  // Add more helper methods as needed
  async getMetrics(): Promise<string> {
    const { register } = await import('prom-client');
    return register.metrics();
  }

  getCounter(name: string): Counter<string> {
    const promClient = require('prom-client');
    let counter = promClient.register.getSingleMetric(name) as Counter<string>;
    if (!counter) {
      counter = new promClient.Counter({ name, help: name, labelNames: ['state'] });
      promClient.register.registerMetric(counter);
    }
    return counter;
  }
}
