import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { PrometheusService } from './prometheus.service';

@Module({
  providers: [
    PrometheusService,
    makeCounterProvider({
      name: 'tallyme_vendor_docs_processed_total',
      help: 'Total number of vendor documents processed',
    }),
    makeCounterProvider({
      name: 'tallyme_student_payments_processed_total',
      help: 'Total number of student payments processed',
    }),
    makeCounterProvider({
      name: 'tallyme_erp_sync_success_total',
      help: 'Total number of successful ERP synchronizations',
    }),
    makeCounterProvider({
      name: 'tallyme_erp_sync_failure_total',
      help: 'Total number of failed ERP synchronizations',
    }),
    makeCounterProvider({
      name: 'tallyme_manual_review_total',
      help: 'Total number of documents flagged for manual review',
    }),
    makeHistogramProvider({
      name: 'tallyme_voucher_generation_latency_seconds',
      help: 'Latency of generating a voucher in seconds',
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
    makeHistogramProvider({
      name: 'tallyme_ocr_confidence',
      help: 'Confidence score of OCR extraction',
      buckets: [0, 20, 50, 75, 90, 95, 99, 100],
    }),
  ],
  exports: [PrometheusService],
})
export class MetricsModule {}
