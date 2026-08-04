# Phase B Implementation Plan V3.0 (Final Production Contract)

## 1. Folder Structure
The implementation will introduce a strictly isolated VMMS directory.
```text
apps/backend/src/modules/vendor-slip/
├── vmms/
│   ├── config/
│   │   └── vmms-feature-flag.service.ts
│   ├── domain/
│   │   ├── models/
│   │   │   ├── vmms-match-result.ts
│   │   │   ├── vmms-match-stage.enum.ts
│   │   │   ├── vmms-match-reason.enum.ts
│   │   │   └── ledger-resolution-result.ts
│   │   ├── services/
│   │   │   ├── vmms-matcher.service.ts
│   │   │   ├── gstin-normalizer.service.ts
│   │   │   └── vmms-evidence-builder.ts
│   ├── application/
│   │   └── vmms-shadow-execution.service.ts
│   └── infrastructure/
│       └── repositories/
│           ├── vmms-vendor-branch.repository.ts
│           ├── vmms-vendor-ledger.repository.ts
│           └── vmms-vendor-match-decision.repository.ts
```

## 2. Asynchronous Shadow Execution Order
To guarantee zero blocking of the legacy pipeline, `VendorSlipWorker` will follow this exact order:
1. Execute Legacy Match
2. Fire & Forget: Schedule `VmmsShadowExecutionService.executeAsync()` in the background.
3. Continue Legacy Processing Immediately (Voucher creation, etc.)

*Rule:* Shadow execution is strictly "best-effort". The worker must NEVER await the VMMS persistence.

## 3. Pure Matcher (Domain Isolation)
`VmmsVendorMatcher` is a pure, deterministic domain service.
- **Forbidden:** No logging, no database writes, no metrics emission, no feature flag evaluations.
- **Contract:** Input (Candidate, Repositories) -> Pure Matching Logic -> Output (`VmmsMatchResult`).

## 4. Evidence Builder & Match Result Versioning
`VmmsEvidenceBuilder` will construct immutable payloads.
- State mutation is strictly prohibited after `build()` is invoked.
- `schemaVersion` (e.g., `v1.0`) will be embedded inside `matchEvidence` to allow future algorithmic evolution without corrupting replay integrity.

## 5. Repository Transaction Boundaries
VMMS Repositories must define strict transaction bounds:
- **`VmmsVendorBranchRepository` / `VmmsVendorLedgerRepository`:** Read-only operations. Never participate in writes or transactions during matching.
- **`VmmsVendorMatchDecisionRepository`:** Asynchronous Write. Never participates in the legacy transaction wrapper. If the dual-write fails (e.g., DB lock), the error is logged and swallowed. Zero synchronous retries.

## 6. Concurrency & Idempotency
Because multiple workers might attempt to shadow-match the same invoice concurrently:
- Dual-write persistence will rely on the `@@unique([invoiceCandidateId])` constraint defined in Phase A.
- `VmmsVendorMatchDecisionRepository.saveDecision()` will use an `upsert` or catch the Unique Constraint violation (P2002) and swallow it to guarantee idempotency and prevent duplicate records.

## 7. Performance Budget
Strict latency targets for VMMS execution:
- **Stage 1 (Exact GSTIN):** < 5 ms
- **Stage 2 (Normalized GSTIN):** < 10 ms
- **Shadow Orchestration (End-to-End):** < 50 ms average
- **Impact on Voucher Generation:** 0 ms (Completely asynchronous off-thread).

## 8. Observability Strategy
Observability is decoupled into three strict streams inside `VmmsShadowExecutionService`:
- **Logs:** Structured logs strictly for debugging (e.g., `VMMS_DISABLED`, `VMMS_DUAL_WRITE_FAILED`, `VMMS_SHADOW_ERROR`).
- **Metrics:** Emitted for datadog/prometheus monitoring.
  - Keys: `vmms.shadow.success`, `vmms.shadow.failure`, `vmms.match.stage1`, `vmms.match.stage2`.
- **Tracing:** APM tags injected for tracing (e.g., `invoiceId`, `vendorBranchId`, `vendorLedgerId`).

## 9. Feature Flag Precedence & Rollout
**Precedence:** Master (`VMMS_ENABLED`) -> Matcher -> Dual Write -> Debug. Overrides apply downward.

**Production Rollout Strategy:**
- **Week 1:** Master OFF (Dark deployment validation).
- **Week 2:** Shadow ON, Dual Write OFF (Observe metrics and matching latency).
- **Week 3:** Shadow ON, Dual Write ON (Begin building parallel decision database).
- **Week 4:** Production Metrics Review (Compare legacy vs VMMS decisions offline).
- **Week 5:** Authorize Phase C implementation.

## 10. Success Criteria
Phase B is certified complete ONLY if runtime evidence proves:
- [ ] Legacy behaviour remains 100% unchanged.
- [ ] All 25 existing tests remain unchanged and green.
- [ ] New VMMS Unit & Integration tests are green.
- [ ] No latency regression in Voucher Generation.
- [ ] Idempotency prevents duplicate dual-writes.
- [ ] Feature flag precedence verified mechanically.
- [ ] Simulated shadow failures never halt the `VendorSlipWorker`.
- [ ] Zero changes to actual Voucher behavior.

## 11. Implementation Rule (Logical Commits)
Implementation must proceed in strict isolation, testing and verifying after each step. Execution halts on the first failure.
1. Feature Flags (`vmms-feature-flag.service.ts`)
2. Repositories (`vmms-vendor-branch.repository.ts`, etc.)
3. Normalizer (`gstin-normalizer.service.ts`)
4. Matcher Domain (`vmms-matcher.service.ts` + Models)
5. Evidence Builder (`vmms-evidence-builder.ts`)
6. Shadow Executor (`vmms-shadow-execution.service.ts`)
7. Worker Integration (Async Dispatch in `vendor-slip.worker.ts`)
8. Comprehensive Tests
