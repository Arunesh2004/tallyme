# Phase 72: Manual Review Certification & Product Lock

## 1. Runtime Execution Path (Missing Tally Master)
The following traces the exact execution path when a required Tally master is missing during the ERP Sync phase:

1. **Voucher Built**: `ProcessVoucherBuilderUseCase` constructs the `VoucherCandidate` and queues the `tally-sync` job.
2. **ERP Sync Initiated**: `ProcessERPSyncUseCase.execute` retrieves the job and voucher.
3. **Accounting Transaction Constructed**: The voucher entries are mapped to a standard `AccountingTransaction`.
4. **Tally Master Validation**: `TallyMasterValidationEngine.validate(accTx)` executes.
   - It fetches the latest `TallyDiscoveryReport`.
   - It checks every party, line item, and tax ledger against the discovered ledgers.
5. **Missing Ledger Detected**: If a ledger is missing, `validationResult.valid` returns `false` with a populated array of `missingMasters`.
6. **Voucher Failed**: `VoucherCandidate` status is updated to `FAILED`.
7. **Manual Review Request**: `ApprovalWorkflowEngine.createApprovalRequest` is invoked for each missing master, generating `ApprovalRequest` records with status `PENDING`.
8. **Audit Entry**: `AccountingDecisionAuditService.logDecision` records the failure (`TALLY_MASTER_VALIDATION`, passed: false) with the exact validation evidence.
9. **Queue Stops**: `ERPSyncJob` status transitions to `MANUAL_REVIEW` and execution safely returns.
10. **Retry Available**: The job remains in a terminal state until explicitly retried.

---

## 2. Manual Review Lifecycle
- **Storage**: `ApprovalRequest` table in PostgreSQL.
- **Created By**: `ApprovalWorkflowEngine`.
- **Status**: `PENDING`.
- **Retry Mechanism**: A retry can be triggered (usually via API). When `ProcessERPSyncUseCase.createJob` is called for the same `voucherCandidateId`, it detects the existing job in `MANUAL_REVIEW` status and resets it to `PENDING` with 0 attempts, effectively re-enqueueing the voucher.

---

## 3. Audit Lifecycle
When a voucher is rejected due to missing masters, the system creates a comprehensive audit trail:
- **Decision Log**: `AccountingDecisionAuditService` logs the exact validation failure.
- **Reason**: The `ApprovalRequest` stores the reason (`Missing Master in Tally`) along with the specific missing entity name (`entityId`).
- **Traceability**: The failure is linked to the specific `companyId` and `voucherId`, ensuring no silent failures occur.

---

## 4. Safety Verification
- **No XML Transport**: The validation engine runs *before* the `TallyXmlBuilderService`. No invalid payload is ever dispatched to Tally.
- **No Partial Creation**: The sync is strictly all-or-nothing per voucher.
- **Queue Stability**: The job transitions to a terminal state (`MANUAL_REVIEW`), preventing infinite retry loops or queue blocking.
- **Data Consistency**: Accounting data remains isolated in TallyMe until validation passes.

---

## 5. Customer Experience (Accountant Context)
The accountant is provided with explicit, granular details regarding the failure. The `ApprovalRequest` specifies:
- The **Type** of missing master (`VENDOR_MASTER`, `STUDENT_MASTER`, `EXPENSE_INCOME_LEDGER`, `GST_LEDGER`).
- The **Name** of the expected ledger that Tally rejected.
*Note: Missing ledger mappings are caught earlier during the Intelligence phase, also routing to Manual Review.*

---

## 6. Recovery Lifecycle
1. The accountant reads the `ApprovalRequest` and identifies the missing ledger.
2. They manually create the ledger inside Tally Prime.
3. They trigger a **Discovery Sync** via the TallyMe portal, updating the `TallyDiscoveryReport`.
4. They click "Retry" on the failed voucher.
5. The system resets the `ERPSyncJob` and re-runs `TallyMasterValidationEngine`, which now succeeds. The pipeline resumes from the sync phase without needing to re-run OCR or extraction.

---

## 7. Repository Audit (Automatic Master Creation)
A deep code search was performed for automatic creation functions:
- `TallyMasterIntelligenceService.ensureLedger`
- `TallyMasterIntelligenceService.ensureGroup`
- `TallyMasterXmlBuilder.buildCreateLedgerXml`

**Finding**: These methods exist in the codebase but are **strictly disconnected** from the `vendor-slip` production pipeline. They are only reachable via isolated management endpoints (e.g., `tally-organization.controller.ts`). 
The production pipeline safely relies on Manual Review.

---

## 8. Production Recommendation
The repository correctly enforces the Product Constitution. The Manual Review workflow ensures absolute safety, prevents polluting the customer's Tally environment with duplicate or erroneous ledgers, and maintains strict auditability.

**Recommendation**: The Vendor Pipeline is certified as Production-Ready under the official Manual Review policy.
