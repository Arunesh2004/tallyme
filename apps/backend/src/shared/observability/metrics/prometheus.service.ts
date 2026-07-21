import { Injectable } from '@common';
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
  ) {}

  incrementVendorDocs() {
    this.vendorDocsProcessed.inc();
  }

  recordOcrConfidence(confidence: number) {
    this.ocrConfidence.observe(confidence);
  }

  // Add more helper methods as needed
}
