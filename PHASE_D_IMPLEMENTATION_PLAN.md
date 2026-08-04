# Phase D Implementation Plan
## VMMS Active Enforcement

## 1. Objective
Transition the Vendor Master Management System (VMMS) from a read-only shadow execution engine into the authoritative active matching engine for the Vendor Slip accounting pipeline. 

## 2. Architectural Invariants Preserved
- **Shared Accounting Engine:** VMMS will produce the exact same `VoucherCandidate` payload for the Shared Engine.
- **Legacy Voucher Behaviour:** When VMMS enforcement is disabled, the legacy `VendorMatcher` will continue to operate exactly as before.
- **Fire-and-forget Shadowing:** If VMMS is enabled but *enforcement* is disabled, the Phase B shadow dual-write behaviour will remain entirely fire-and-forget.
- **SQL Safety & O(1) Memory:** Maintained from Phase C.
- **No Schema Changes:** The database schema remains strictly frozen.

## 3. Logical Commits

### Commit 1: Core Worker Enforcement
- **Scope:** Introduce `VMMS_ACTIVE_ENFORCEMENT_ENABLED` feature flag.
- **Implementation:** Modify `VendorSlipWorker`. If enforcement is true, `await` VMMS execution synchronously instead of invoking it via `.catch()` as a fire-and-forget promise. Bypass the legacy `this.matcher.match()`. Extract the `selectedVendorLedger` from the `VendorMatchDecision` and inject it directly into the `VoucherCandidate` generic payload, bypassing legacy Ledger mapping.
- **Failure Handling:** If VMMS explicitly flags `requiresManualReview: true`, or fails to find a ledger, the worker halts and updates the candidate status to `MANUAL_REVIEW_REQUIRED`.

### Commit 2: VMMS-Native Manual Review API
- **Scope:** Implement `POST /api/v1/vmms/review/approve`.
- **Implementation:** When an invoice halts in manual review under VMMS enforcement, this API allows an accountant to manually select a `VendorBranchId`. The system will generate a `VendorMatchDecision` with a `MANUAL_OVERRIDE` stage, write to `VendorAudit`, and enqueue the `build-purchase-voucher` BullMQ job natively.

## 4. Rollback Plan
- Flip `VMMS_ACTIVE_ENFORCEMENT_ENABLED` to `false` via the feature flag service. The worker instantly reverts to using the legacy `VendorMatcher` for all subsequent queue jobs. No database migrations are required to roll back.
