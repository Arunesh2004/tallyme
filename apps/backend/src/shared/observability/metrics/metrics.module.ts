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
    makeCounterProvider({
      name: 'tallyme_queue_active_jobs',
      help: 'Total number of active BullMQ jobs',
    }),
    makeCounterProvider({
      name: 'tallyme_queue_failed_jobs',
      help: 'Total number of failed BullMQ jobs',
    }),
    makeCounterProvider({
      name: 'outbox_pending_total',
      help: 'Total pending outbox events',
    }),
    makeCounterProvider({
      name: 'outbox_failed_total',
      help: 'Total failed outbox events',
    }),
    makeCounterProvider({
      name: 'outbox_dead_total',
      help: 'Total dead outbox events',
    }),
    makeCounterProvider({
      name: 'cleanup_deleted_total',
      help: 'Total cleanup items deleted',
    }),
    makeCounterProvider({
      name: 'reconciliation_total',
      help: 'Total items reconciled',
    }),
    makeCounterProvider({
      name: 'draft_failed_total',
      help: 'Total failed drafts',
    }),
    makeCounterProvider({
      name: 'retry_total',
      help: 'Total items retried',
    }),
    makeHistogramProvider({
      name: 'relay_processing_seconds',
      help: 'Time spent relaying outbox events',
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
    makeHistogramProvider({
      name: 'voucher_build_seconds',
      help: 'Time spent building vouchers',
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
    makeHistogramProvider({
      name: 'erp_sync_seconds',
      help: 'Time spent syncing to ERP',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
    makeCounterProvider({
      name: 'audit_drop_total',
      help: 'Total number of dropped audit logs',
    }),
    makeCounterProvider({
      name: 'cron_lock_acquired_total',
      help: 'Total number of cron locks acquired',
    }),
    makeCounterProvider({
      name: 'cron_lock_failed_total',
      help: 'Total number of cron locks failed to acquire',
    }),
    makeCounterProvider({
      name: 'tallyme_cron_lock_failed_total',
      help: 'Total number of cron locks failed',
    }),
    makeHistogramProvider({
      name: 'tallyme_classification_accuracy',
      help: 'Accuracy confidence of document classification',
      buckets: [0, 20, 50, 75, 90, 95, 99, 100],
    }),
    makeHistogramProvider({
      name: 'tallyme_canonical_extraction_accuracy',
      help: 'Accuracy confidence of canonical extraction',
      buckets: [0, 20, 50, 75, 90, 95, 99, 100],
    }),
    makeHistogramProvider({
      name: 'tallyme_ledger_mapping_accuracy',
      help: 'Accuracy confidence of ledger mapping',
      buckets: [0, 20, 50, 75, 90, 95, 99, 100],
    }),
    makeCounterProvider({
      name: 'tallyme_voucher_success_rate_total',
      help: 'Total successful vouchers built',
    }),
    makeCounterProvider({
      name: 'tallyme_xml_acceptance_rate_total',
      help: 'Total successful XML generations',
    }),
    makeCounterProvider({
      name: 'tallyme_duplicate_detection_rate_total',
      help: 'Total duplicate documents detected',
    }),
    makeCounterProvider({
      name: 'tallyme_manual_review_rate_total',
      help: 'Total manual reviews initiated during universal flow',
    }),
    makeCounterProvider({
      name: 'tallyme_feature_flag_usage_total',
      help: 'Total executions controlled by feature flag (labeled by state)',
      labelNames: ['state'],
    }),
    makeCounterProvider({
      name: 'tallyme_compatibility_adapter_usage_total',
      help: 'Total usages of the PurchaseCompatibilityAdapter',
    }),
    makeCounterProvider({
      name: 'tallyme_dual_run_success_total',
      help: 'Total successful dual-run matches',
    }),
    makeCounterProvider({
      name: 'tallyme_dual_run_mismatch_total',
      help: 'Total dual-run mismatches detected',
    }),
    makeHistogramProvider({
      name: 'tallyme_migration_progress',
      help: 'Percentage of remaining legacy consumers migrated',
      buckets: [0, 25, 50, 75, 100],
    }),
    makeHistogramProvider({
      name: 'tallyme_migration_readiness',
      help: 'Readiness gate aggregate score (0=Blocked, 100=Ready)',
      buckets: [0, 100],
    }),
    makeCounterProvider({
      name: 'cron_lock_contention_total',
      help: 'Total number of lock contentions (locked by another pod)',
    }),
  ],
  exports: [PrometheusService],
})
export class MetricsModule {}
