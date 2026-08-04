# Phase C Domain Model

## 1. Core Abstractions

### A. MatchComparisonResult
A purely transient, in-memory domain aggregate that represents the outcome of evaluating a legacy routing decision against a VMMS routing decision.
**Fields:**
- `invoiceId`: UUID
- `legacyVendorId`: UUID (Nullable)
- `vmmsLedgerId`: UUID (Nullable)
- `category`: Enum (`MATCH`, `MISMATCH`, `MANUAL_REVIEW`, `UNKNOWN`)
- `discrepancyReason`: String (e.g., "Legacy matched via fuzzy name, VMMS failed on invalid GSTIN")
- `marginDelta`: Number (Difference in confidence scores between models)

### B. VmmsAnalyticsSnapshot
A calculated time-series snapshot representing system health at a given interval (e.g., daily).
**Fields:**
- `timestamp`: DateTime
- `totalProcessed`: Integer
- `legacyMatches`: Integer
- `vmmsMatches`: Integer
- `agreementRate`: Float (Percentage)
- `stage1MatchRate`: Float (Percentage)
- `stage2MatchRate`: Float (Percentage)
- `averageLatencyMs`: Float
- `shadowFailures`: Integer

### C. MismatchResolution
Represents the human administrative decision rectifying a divergence between the systems.
**Fields:**
- `invoiceId`: UUID
- `reviewerId`: UUID
- `verdict`: Enum (`LEGACY_CORRECT`, `VMMS_CORRECT`, `BOTH_WRONG`)
- `proposedAlias`: String (Nullable, if a new alias should be created)
- `notes`: String

## 2. Model Relationships
- `MatchComparisonResult` maps 1-to-1 with a specific `VendorMatchDecision` and `InvoiceCandidate`.
- `MismatchResolution` maps 1-to-1 with a `MatchComparisonResult` and yields exactly one `VendorAudit` log indicating the human intervention.
- `VmmsAnalyticsSnapshot` is a rolling window aggregate that relies on the raw tabular data of `VendorMatchDecision`.

## 3. Boundary Contexts
- **Analytics Context:** Strictly read-only operations spanning `InvoiceCandidate`, `VendorMatchDecision`, and `VendorLedger`.
- **Administrative Context:** Write-operations limited to `VendorAudit` (for logging human decisions) and `VendorAlias` (for deploying fixes).
- **Voucher Building Context:** Strictly off-limits. Phase C components possess zero awareness of and zero access to voucher generation domains.
