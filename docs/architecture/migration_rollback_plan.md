# Migration Rollback Plan

## Purpose
Ensure a safe, zero-downtime regression path in case the Universal Document Intelligence Pipeline experiences catastrophic failure in production.

## Immediate Rollback Execution
1. Set the environment variable `USE_UNIVERSAL_INGESTION=false`.
2. Restart the deployment (if hot-reload is unavailable).

## Impact
- **Universal Pipeline:** Disabled immediately. No new documents will route to the classification engine.
- **Legacy Pipeline:** Active immediately. Uploads will fallback to the hardcoded OCR extraction and directly spawn `InvoiceCandidate`.

## Data Guarantees
- **No Duplicate Documents:** The document upload layer remains intact. The flag only controls the processing path.
- **No Duplicate Vouchers:** Vouchers are generated downstream of both pipelines. Reverting the flag will not replay already-generated vouchers.
- **No Duplicate Sync:** ERP Sync mechanisms rely on idempotency keys and are decoupled from the ingestion pipeline.
- **No Schema Rollback:** Because we introduced `PurchaseCompatibilityAdapter`, legacy systems still see `InvoiceCandidate`. Disabling the flag just routes directly to `InvoiceCandidate` again. No database migrations are required to rollback.

## Recovery Verification
1. Verify `tallyme_feature_flag_usage_total{state="OFF"}` increments.
2. Verify legacy `InvoiceCandidate` records are being created natively (not via adapter).
3. Monitor `tallyme_voucher_success_rate_total` to ensure business continuity.
