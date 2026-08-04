# Rollout Governance

## 1. Development
- **Prerequisites:** Local codebase updated, dependencies installed.
- **Entry Criteria:** PR created.
- **Exit Criteria:** Unit tests pass, E2E tests pass, linting passes.
- **Rollback Criteria:** Tests fail, DI failures.
- **Acceptance Criteria:** Code review approved.

## 2. Internal Testing
- **Prerequisites:** Merged to `develop` branch.
- **Entry Criteria:** Deployed to internal isolated environment.
- **Exit Criteria:** QA script executes successfully.
- **Rollback Criteria:** Memory leaks, exceptions in logs.
- **Acceptance Criteria:** `Migration Readiness Gate` passes internally.

## 3. QA
- **Prerequisites:** End-to-end data seeded.
- **Entry Criteria:** Deployed to QA environment.
- **Exit Criteria:** 100% test coverage executed by QA automation.
- **Rollback Criteria:** Broken legacy Purchase pipeline.
- **Acceptance Criteria:** All edge cases and unknown document types tested.

## 4. Staging
- **Prerequisites:** Production snapshot cloned to staging database.
- **Entry Criteria:** Deployed to Staging.
- **Exit Criteria:** Dual-run metrics demonstrate <1% mismatch for Purchase workflow.
- **Rollback Criteria:** Any ERP sync duplication detected.
- **Acceptance Criteria:** Full performance profile approved.

## 5. Canary
- **Prerequisites:** Approval from release manager.
- **Entry Criteria:** 5% of traffic routed to Universal Pipeline via `USE_UNIVERSAL_INGESTION`.
- **Exit Criteria:** 48 hours without critical incidents.
- **Rollback Criteria:** Increase in 500 errors, customer support tickets.
- **Acceptance Criteria:** Success rate matches or exceeds legacy pipeline.

## 6. Pilot Customers
- **Prerequisites:** Opt-in explicitly granted by beta customers.
- **Entry Criteria:** `USE_UNIVERSAL_INGESTION` enabled for specific tenant IDs.
- **Exit Criteria:** 2 weeks of live processing.
- **Rollback Criteria:** Feature flag toggled off for specific tenants.
- **Acceptance Criteria:** Customer sign-off on extraction accuracy.

## 7. Production Global Rollout
- **Prerequisites:** Pilot successful.
- **Entry Criteria:** `USE_UNIVERSAL_INGESTION` set to `TRUE` globally.
- **Exit Criteria:** Legacy pipeline shows 0 traffic.
- **Rollback Criteria:** Any systemic data corruption (requires immediate toggle to FALSE).
- **Acceptance Criteria:** Metrics stabilize at 100% Universal processing.
