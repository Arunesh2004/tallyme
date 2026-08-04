# Phase D Domain Model Updates

The core domain model requires **ZERO** Prisma schema migrations. We will utilize the existing flexible JSONB fields and relational structures implemented during Phase B to support Active Enforcement.

## 1. VendorMatchDecision Evidence
The `matchEvidence` JSONB payload within `VendorMatchDecision` will be extended natively at the Domain/DTO layer to include:
- `executionMode`: `"SHADOW"` | `"ENFORCED"` 
  *(Tracks whether this decision was made passively in the background, or if it actively drove the accounting voucher generation).*
- `manualOverride`: `boolean` 
  *(True if the decision was generated via the Phase D Review API rather than the automated pipeline).*
- `overrideComment`: `string` 
  *(The accountant's justification, copied from the API request).*

## 2. VmmsFeatureFlagService
A new domain flag is introduced to the `VmmsFeatureFlagService`:
- **Key:** `VMMS_ACTIVE_ENFORCEMENT_ENABLED`
- **Type:** `boolean`
- **Default:** `false`
- **Rule:** Active Enforcement can only evaluate to `true` if its prerequisite parent flags (`VMMS_ENABLED`, `VMMS_MATCHER_ENABLED`, and `VMMS_DUAL_WRITE_ENABLED`) are also true.

## 3. Shared Accounting Interface
No changes to `VoucherCandidate` or `AccountingTransaction` entities are required. VMMS structurally maps its `selectedVendorLedger.ledgerName` to perfectly satisfy the existing `GenericPayload` structure expected by the `VOUCHER_BUILDER_QUEUE`, preserving total isolation between the matching domain and the accounting domain.
