# Implementation Risk Register (VMMS)

The following semantic, architectural, and operational risks have been validated and addressed in the final Domain Model Contract V1.0.

## 1. Semantic Contradictions & Overlaps
- **RISK:** `VendorBranch` acting as both a tax identity (GSTIN) and an accounting identity (Ledger), causing duplicate GSTIN rows and matching ambiguity.
  - **RESOLUTION:** The `VendorLedger` entity was introduced. `VendorBranch` maintains strict GSTIN uniqueness. `VendorLedger` handles ERP-specific 1-to-N accounting configurations. Contradiction resolved.

## 2. Multi-Tenancy Leaks
- **RISK:** A globally configured `VendorAlias` automates an invoice to the wrong ledger in a multi-tenant environment.
  - **RESOLUTION:** The `@@unique([companyId, aliasText])` constraint forces absolute tenant isolation. Aliases CANNOT leak across companies.

## 3. Bad Learning & Automation Runaway
- **RISK:** A junior accountant makes a terrible manual mapping (e.g., matching "Uber" to "Subway"), which creates an alias that instantly misroutes thousands of future invoices.
  - **RESOLUTION:** The Maturity Model enforces `status = PENDING`. Aliases require either Administrative Approval or strict repeated validation by diverse users over time before achieving `AUTOMATED` status. The "Delta > 10" rule prevents similar names from ever auto-matching, completely mitigating this risk.

## 4. Replay & Audit Inconsistencies
- **RISK:** Attempting to replay historical invoices yields different ledgers because aliases or branch names changed over time.
  - **RESOLUTION:** `VendorMatchDecision` captures `matchEvidence` as an immutable JSONB payload at the time of execution. `VendorAudit` strictly uses an append-only log. The architecture guarantees point-in-time point-of-truth reconstruction.

## 5. Performance Bottlenecks
- **RISK:** Fuzzy matching 100,000 vendors using Postgres `ILIKE` or Levenshtein distance creates unacceptable CPU loads.
  - **RESOLUTION:** Implementation Roadmap Phase D explicitly requires `pg_trgm` GIN indexing for $O(\log N)$ performance, and fuzzy matching is strictly placed at Stage 6 (evaluated ONLY if $O(1)$ Hash lookups fail).

## 6. Migration Deadlock
- **RISK:** Altering the massive `Vendor` table locks the database during working hours.
  - **RESOLUTION:** Phase A adds new tables and nullable relations. No table rewrites occur. Phase F utilizes raw SQL batch processing to migrate data concurrently before dropping legacy columns.
