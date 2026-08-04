# Migration Readiness Specification

## Purpose
This document defines the strict threshold gates that must be satisfied before the `USE_UNIVERSAL_INGESTION` feature flag can be toggled to `TRUE` in any environment. 

## Readiness Check Matrix

| Component | Check | Status |
| :--- | :--- | :--- |
| **Architecture** | Universal pipeline implementation complete without violating frozen Enterprise patterns. | `PENDING` |
| **Compatibility** | `PurchaseCompatibilityAdapter` intercepts all generic drafts and maps 1:1 to legacy interfaces. | `PENDING` |
| **Feature Flag** | Centralized configuration via `env.schema.ts` allows instantaneous fallback. | `PENDING` |
| **Legacy Regression** | `e2e-vendor.spec.ts` (and all legacy suites) pass completely. | `PENDING` |
| **Universal Regression** | `e2e-universal-ingestion.spec.ts` passes for all 15 document types. | `PENDING` |
| **Memory/Time Leaks** | No lingering timeouts (Fetch, BullMQ, Node EventLoop). | `PENDING` |
| **Database** | Prisma connections close safely; no zombie locks. | `PENDING` |
| **Dual Run** | Extraction mismatch rate for Purchase documents is <= 0.01%. | `PENDING` |
| **Coverage** | Unit testing coverage >= 95% on universal pipeline logic. | `PENDING` |
| **ERP Validation** | E2E output identically matches live Tally Prime expected XML payloads. | `PENDING` |

## Final Verdict Computation
- If **ALL** statuses equal `PASS`:
  - **Verdict:** `READY`
  - **Action:** Recommend enabling `USE_UNIVERSAL_INGESTION`.
- If **ANY** status equals `FAIL` or `PENDING`:
  - **Verdict:** `BLOCKED`
  - **Action:** Maintain legacy pipeline. Rollout is strictly prohibited.
