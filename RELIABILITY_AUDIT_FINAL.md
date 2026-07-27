# Reliability Audit — Final

**Audit Method**: Direct code inspection of error paths, state machines, workers, and guard conditions.

---

## 1. ERP State Machine — VERIFIED (Strong)

✅ Terminal states (`SYNCED`, `FAILED_PERMANENT`, `MANUAL_REVIEW`, `CANCELLED`) are correctly guarded in `execute()`.
✅ Concurrent worker race condition handled via `ConcurrentMutationException` catch.
✅ Timeout scenarios correctly transition to `UNKNOWN` (not `FAILED`) preventing incorrect data assumptions.
✅ Idempotency hash (`SHA-256` of `companyId:candidateId:voucherNumber`) prevents duplicate voucher creation via DB unique constraint.
✅ `FAILED_TEMPORARY` → `RETRY_PENDING` → re-throw correctly triggers BullMQ native backoff.

---

## 2. Unhandled Exceptions — FINDINGS

🔴 **`ERPSyncWorker.process()` line 19–23**: When `job.data.jobId` is absent and `job.data.voucherCandidateId` is present, `createJob()` is called but if it returns `null` (e.g. due to a P2002 that returned a null existing job), `syncJobId` will be `undefined/null`. `execute(null, ...)` will then try `findJobById(null)` which returns undefined and silently exits with no logging.

⚠️ **`PaymentExtractor.extract()`** always succeeds (returns a hardcoded stub amount). If the extraction result is garbage, the pipeline will create a `VoucherCandidate` with `amount=15000` regardless of the actual email content. There is no validation that extracted data is reasonable.

🔴 **`StudentVoucherMappingPolicy.getBankLedger()`** always returns `'Bank Account'` regardless of `paymentMethod`. Any gateway-specific ledger (HDFC, ICICI, Razorpay settlement) will be posted to a single generic ledger in Tally, creating accounting errors.

---

## 3. Stub Endpoints — CRITICAL

🔴 **`ManualReviewController.approveReview()` returns `{ id, status: 'APPROVED' }` without performing any actual database update or pipeline continuation.** A reviewer clicking "Approve" in the UI does nothing to the data.

🔴 **`StudentManualReviewController.approveReview()` has the same problem.** Approvals are no-ops.

🔴 **`OutboxWorker` is completely stubbed** (`const events: any[] = []`). The transactional outbox provides zero reliability benefit — any event dispatched via the outbox is silently dropped.

---

## 4. Duplicate Processing

✅ ERP idempotency hash prevents duplicate voucher syncs.
✅ `EmailDocument.messageId` UNIQUE constraint prevents duplicate email processing.
✅ `Document.checksum` is stored for duplicate upload detection (though the actual duplicate-check logic was not verified to be called at upload time).

---

## 5. Race Conditions — VERIFIED

✅ `createJobIfAbsent()` handles P2002 unique constraint violations gracefully.
✅ `ProcessERPSyncUseCase` uses conditional state transitions to prevent concurrent mutation.

---

## 6. Partial Failures

⚠️ `OcrController.processInvoice()` persists `InvoiceCandidate` then dispatches to BullMQ. If BullMQ dispatch fails, the candidate record exists in the database but will never be processed — no rollback or compensation.

---

## Summary

| Area | Status |
|---|---|
| ERP state machine | 🟢 VERIFIED — robust |
| ERPSyncWorker null jobId edge case | 🔴 HIGH — silent failure |
| Manual review approve endpoints | 🔴 CRITICAL — stub, no-op |
| Student bank ledger mapping | 🔴 HIGH — all payments go to one ledger |
| OutboxWorker | 🔴 HIGH — completely stubbed |
| Payment extraction | 🔴 CRITICAL — hardcoded amount (15000) |
| Idempotency | 🟢 VERIFIED |
| Race conditions | 🟢 VERIFIED |
