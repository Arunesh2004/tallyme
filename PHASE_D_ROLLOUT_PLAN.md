# Phase D Rollout Plan

## 1. Pre-Deployment Checklist
- [ ] Phase C Analytics dashboard shows 0% Shadow Error Rate for the last 7 days.
- [ ] Agreement Rate > 95% across all active companies (Legacy vs VMMS shadow).
- [ ] Phase D tests pass with 100% coverage on the new Worker routing and manual review API logic.
- [ ] Production Database is backed up.

## 2. Staged Activation
Phase D utilizes a zero-downtime, instantaneous cutover mechanism via the database-backed Feature Flags.

### Stage 1: Deployment (Day 0)
- Deploy Phase D code to production.
- `VMMS_ACTIVE_ENFORCEMENT_ENABLED` remains `false`.
- **Expected Outcome:** System continues using Legacy Matcher exactly as before. VMMS continues dual-writing in shadow mode. No operational impact.

### Stage 2: Canary Tenant (Day 1)
- Enable `VMMS_ACTIVE_ENFORCEMENT_ENABLED=true` scoped to a single, low-volume `companyId` (e.g., internal test company).
- **Expected Outcome:** The canary company bypasses the Legacy Matcher. Vouchers are built exclusively using VMMS decisions.
- **Validation:** Cross-check the generated Tally XMLs against historical baselines for that company to ensure accounting parity.

### Stage 3: Global Cutover (Day 3)
- Enable `VMMS_ACTIVE_ENFORCEMENT_ENABLED=true` globally.
- **Expected Outcome:** Legacy Matcher is fully bypassed for all traffic. VMMS becomes the sole authoritative vendor matching engine for the platform.

## 3. Rollback Strategy
If any anomaly (e.g., misallocated ledgers, unhandled worker exceptions, ERP validation failures) is detected:

1. **Immediate Halt:** 
   Execute the following SQL on production:
   `UPDATE "FeatureFlag" SET value = 'false' WHERE key = 'VMMS_ACTIVE_ENFORCEMENT_ENABLED';`
2. **Instant Reversion:** 
   The very next tick of `VendorSlipWorker` will instantly revert to utilizing the Legacy Matcher.
3. **No Code Redploy:** 
   No code redeployment, pod restarts, or database migrations are required to halt Phase D and restore Phase B/C behaviour.
