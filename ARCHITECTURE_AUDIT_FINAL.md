# Architecture Audit — Final

**Audit Method**: Direct code inspection. Documentation not trusted.

---

## 1. Shared Accounting Engine — VERIFIED

✅ `VoucherBuilderModule` is the single engine. Found in `apps/backend/src/modules/voucher-builder/`.
✅ Both vendor and student pipelines dispatch to `VOUCHER_BUILDER_QUEUE` — no duplicates found.
✅ `VoucherBuilderEngine` builds `VoucherCandidate` records; does not bypass Prisma or ERP Connector.
✅ No secondary accounting logic found in controllers or domain services.

---

## 2. ERP Connector — VERIFIED

✅ `ERPConnectorModule` is the single connector. All Tally communication routes through `TallyTransportService`.
✅ `ERPConnectorEngine.syncVoucher()` is the single entry point.
✅ `ERPSyncWorker` delegates exclusively to `ProcessERPSyncUseCase`.
✅ No second transport or XML builder found by grep.

---

## 3. Controller Business Logic — FINDING

🔴 **CRITICAL: `OcrController.processInvoice()` (line 45) persists directly to `InvoiceCandidate` via raw Prisma call inside the controller.** This is controller-level persistence — a domain boundary violation.

🔴 **CRITICAL: `ReviewController.approveInvoice()` (line 59) updates `InvoiceCandidate` status directly in the controller using Prisma.** No service layer or use-case mediates this mutation.

⚠️ The `ProcessERPSyncUseCase` (line 303–339) also calls raw `this.prisma.batchSyncItem` directly — the use-case has direct Prisma dependencies bypassing the repository pattern it otherwise enforces for `ERPSyncJob`.

---

## 4. Hardcoded Company ID — FINDING

🔴 **HIGH: `'COMP-1'` is hardcoded as the company ID in 8 production code locations:**
- `vendor-slip.worker.ts` line 112
- `student-voucher.orchestrator.ts` line 47
- `batch-sync.worker.ts` line 51
- `batch-sync.controller.ts` line 166
- `review.controller.ts` line 67
- `ocr.controller.ts` line 60

This means **every voucher created is owned by the hardcoded company 'COMP-1' with an empty name**. In production, this breaks any multi-tenant or even single-company setup where the actual company name matters for Tally.

---

## 5. Module Boundaries — FINDING

⚠️ `ProcessERPSyncUseCase` directly imports `PrismaService` for `batchSyncItem` and `batchSyncJob` operations (lines 18, 305, 311, 317). This bypasses the established `IERPRepository` pattern in the same class and creates a tight coupling to the ORM layer inside a use-case.

---

## 6. Dependency Direction — VERIFIED

✅ Overall direction is correct: Controllers → Use Cases → Services → Repositories → Prisma.
✅ `ERPConnectorModule` exports are minimal and correct.
✅ No circular dependency evidence found.

---

## Summary

| Control | Status |
|---|---|
| Single Accounting Engine | 🟢 VERIFIED |
| Single ERP Connector | 🟢 VERIFIED |
| No duplicate pipelines | 🟢 VERIFIED |
| No controller business logic | 🔴 VIOLATED (OcrController, ReviewController) |
| Hardcoded company ID | 🔴 PRODUCTION BLOCKER |
| Repository pattern consistency | ⚠️ Partial violation in ProcessERPSyncUseCase |
