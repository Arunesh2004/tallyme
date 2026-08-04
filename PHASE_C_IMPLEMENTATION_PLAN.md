# Phase C Implementation Plan

## 1. Overview
This document outlines the strictly ordered execution of Phase C: Operational Visibility & Intelligence. No code changes to the underlying Phase B VMMS engine or the legacy voucher generation system are permitted.

## 2. Logical Commits

### Commit 1: Analytics Data Layer
- **Scope:** Create `VmmsAnalyticsRepository` and DTOs mapping raw `VendorMatchDecision` records into the `VmmsAnalyticsSnapshot` domain model.
- **Constraints:** Read-only access to existing Prisma models. No schema modifications.

### Commit 2: Comparison Engine API
- **Scope:** Implement the `GET /api/v1/vmms/analytics/mismatches` REST endpoint and its supporting service to diff legacy decisions against VMMS decisions on the fly.
- **Constraints:** Must use cursor-based pagination to prevent memory exhaustion on large datasets.

### Commit 3: Replay Simulator
- **Scope:** Implement the `POST /api/v1/vmms/replay` endpoint. Instantiate a detached instance of `VmmsVendorMatcher` to run in a purely stateless, non-persisting context.
- **Constraints:** Must not inject the `VmmsShadowExecutionService` or `VendorMatchDecisionRepository` into the replay context.

### Commit 4: Administrative Action APIs
- **Scope:** Implement the `POST /api/v1/vmms/admin/resolve-mismatch` and `create-alias` endpoints.
- **Constraints:** Strict write permissions required. Every invocation must transactionally commit an audit log to `VendorAudit`.

### Commit 5: Dashboard Frontend UI
- **Scope:** Implement the React/Next.js dashboard using the defined API contract (`PHASE_C_DASHBOARD_SPEC.md`).
- **Constraints:** Read-only UI state. No capability to modify core legacy invoice payloads.

## 3. Testing Strategy
- **Unit Tests:** 100% coverage on the Comparison Engine logic to ensure accurate `MATCH`/`MISMATCH` detection.
- **Integration Tests:** The Replay Simulator must be tested against mocked `InvoiceCandidate` records to prove zero database persistence occurs.
- **Contract Tests:** API endpoints must be verified against their stated DTO specifications.

## 4. Rollback Plan
- Because Phase C introduces zero schema changes and only introduces new read/admin API endpoints, rolling back consists entirely of reverting the API controller registrations and disabling the Dashboard UI. It has a zero-impact blast radius on the accounting pipeline.

## 5. Success Criteria
- [ ] Comparison engine correctly categorizes `MATCH` vs `MISMATCH` with 100% accuracy.
- [ ] Replay engine functions deterministically without modifying database state.
- [ ] Admin dashboard renders aggregation metrics in under 500ms.
- [ ] Zero schema changes occurred.
- [ ] Legacy voucher pipeline remains utterly untouched.
