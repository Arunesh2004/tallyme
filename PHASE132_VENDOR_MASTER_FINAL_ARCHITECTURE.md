# Phase 132 - Vendor Master Final Architecture (Enterprise MDM Review)

## Executive Summary
This document serves as the definitive Master Data Management (MDM) architecture for the Vendor Master Management System (VMMS). It evaluates the Phase 131 design against strict enterprise governance, auditability, and operational standards expected of platforms like SAP MDG or Oracle ERP. 

---

## PART 1: MASTER DATA GOVERNANCE
**Vendor Lifecycle Governance:** 
The `Vendor` entity is a governed Master Data object. It cannot simply be `ACTIVE` or `DELETED`. It must support a strict lifecycle:
- `DRAFT`: Created via OCR/Extraction, missing mandatory ERP fields.
- `PENDING_VERIFICATION`: Awaiting approval from a Master Data Administrator.
- `ACTIVE`: Fully approved and available for automated ledger matching.
- `INACTIVE`: Vendor no longer used. Halts automated matching; forces manual review.
- `BLOCKED`: Blacklisted vendor. Halts all processing and flags for compliance review.
- `MERGED`: Soft-deleted post-consolidation. Points to a surviving Vendor UUID.

---

## PART 2: VENDOR BRANCH GOVERNANCE
**Branch Lifecycle & Immutability:**
- **Can GSTIN change?** Legally, in most tax jurisdictions (like India), a GSTIN is tied to a specific registration. If it changes, it represents a new legal registration. The system MUST close the old branch (`INACTIVE`) and open a new `VendorBranch`.
- **Can an ERP ledger change?** Yes, if the accounting team restructures their Chart of Accounts. The `erpLedgerCode` on the `VendorBranch` updates, tracked via `VendorAudit`.
- **Should historical invoices move?** **Absolutely NOT.** Historical `VendorMatchDecision` records map to the specific `VendorBranch` ID as it existed at the time of the transaction. Mutating history destroys auditability.

---

## PART 3: ALIAS GOVERNANCE
**Governing the Automation Rules:**
Aliases (`VendorAlias`) are essentially automated routing rules. They must be strictly governed:
- `effectiveFrom`: Timestamp of creation.
- `lastUsedAt`: Tracks alias vitality.
- `expiry` / `status`: If an alias is unused for 24 months, a cron job marks it `STALE`. It drops out of the active automation cache to improve search performance.
- **Approval Workflow**: A regular accountant manually routing an invoice creates a `PENDING` alias. It requires a Master Data Admin (or the system's maturity engine) to promote it to `APPROVED` for full automation.
- **Confidence History**: Handled by the integrated `successfulUses` and `reversals` counters defined in Phase 131.

---

## PART 4: MASTER DATA QUALITY
**Automated Maintenance:**
A background Data Steward Cron Job will continuously evaluate MDM quality:
- **Duplicate Detection**: Strict match on `GSTIN` or `PAN`. Fuzzy match (Trigram similarity > 95%) on `VendorName` + `City` to flag potential duplicate masters for administrative review.
- **Orphan/Broken Aliases**: Detect aliases pointing to `INACTIVE` or `MERGED` branches and automatically repoint or revoke them.
- **Conflicting Aliases**: Detect if two branches share the exact same alias text (a fatal flaw that breaks deterministic matching) and flag for resolution.

---

## PART 5: LEARNING GOVERNANCE
**Who owns the learning?**
- The **Tenant (Company)** owns the learning. Cross-tenant learning is strictly prohibited to prevent data leakage and cross-pollution of ledgers.
- **Accountant vs. Admin**: Accountants provide *suggestions* (by manually routing invoices). The System handles *maturation* (promoting suggestions after N consecutive successes). Administrators hold *veto power* (can manually approve/revoke).
- **Import/Export**: Yes. A conglomerate using TallyMe across 5 sister companies can export `APPROVED` global aliases (e.g., standardizing "Amazon Web Services" variations) and import them across their isolated tenants.

---

## PART 6: SEARCH ENGINE
**Lookup Hierarchy & Mechanics:**
To guarantee $O(1)$ performance where possible, search MUST execute in a strict cascading order. It stops at the first successful tier:
1. **Exact Identifier**: $O(1)$ lookup on GSTIN/PAN.
2. **Exact Alias / Normalized Name**: $O(1)$ Hash lookup on stripped, lowercased text.
3. **Fuzzy Search**: $O(\log N)$ Trigram similarity (`pg_trgm`) on `VendorBranch.branchName`.
   - *Note on Phonetic (Soundex):* Rejected. Phonetic matching is too loose for B2B accounting and generates severe false positives.
- **Ranking**: The final rank is the Phase 131 absolute mathematical score $\times$ OCR Extraction Confidence.

---

## PART 7: AUDIT GOVERNANCE
**Immutable Append-Only Logging:**
The `VendorAudit` table is an append-only Event Sourcing log. The following events MUST be immutable and digitally signed/hashed to prevent tampering:
- `VENDOR_CREATED`, `VENDOR_MERGED`, `VENDOR_BLOCKED`
- `ALIAS_PROMOTED` (crucial for blaming bad automation)
- `ALIAS_REVOKED`
- `MANUAL_OVERRIDE_APPLIED`

Voucher postings and reversals are audited by the ERP Sync Engine, but the Match Decision changes that caused them are audited here.

---

## PART 8: SECURITY & RBAC
**Role-Based Access Control:**
- **Operator / Junior Accountant**: Can upload invoices, can perform manual review (which creates `PENDING` aliases). Cannot approve aliases or modify Master Data.
- **Senior Accountant**: Can override automated matches, can approve low-risk aliases.
- **Master Data Administrator**: Can create/merge/block Vendors. Can approve high-risk aliases (e.g., an alias that is dangerously close to another vendor's name).

---

## PART 9: OPERATIONS
**Administration Tools for Year 5:**
At scale, the platform requires a dedicated "Master Data Management" dashboard:
1. **Alias Quarantine**: A queue of `PENDING` or heavily reversed aliases awaiting human verdict.
2. **Duplicate Resolution Center**: A side-by-side comparison tool allowing an Admin to merge Vendor A into Vendor B, automatically repointing all aliases and historical references.
3. **Mass Operations**: Bulk CSV import/export for initial onboarding of a school's legacy Tally ledgers and known aliases.

---

## PART 10: DISASTER RECOVERY
**Rebuilding the Engine:**
Because the `InvoiceCandidate` table permanently stores the raw extracted OCR JSON, the Vendor Matching Engine is entirely replayable.
- If the `VendorAlias` table is corrupted or bad learning infects a tenant, administrators can drop the alias table and trigger a **Replay Job**.
- The Replay Job iterates chronologically through all historical `VendorMatchDecision` records (where `resolvedByUserId` is not null), effectively rebuilding the `successfulUses` and maturity scores of all aliases from scratch based on actual human historical decisions.

---

## PART 11: OBSERVABILITY
**Production KPIs (Prometheus / Grafana Metrics):**
- `vmms.match.auto_rate`: % of invoices that skip manual review entirely. (Target: >85%).
- `vmms.match.false_positive_rate`: Measured strictly by the number of `VendorMatchDecision` records transitioning from `ACTIVE` to `REVERSED`. (Target: <0.1%).
- `vmms.alias.growth_rate`: Tracking alias creation to ensure the DB doesn't bloat endlessly.
- `vmms.ocr.top_failures`: Which vendors consistently fail Stage 1/2 matching, indicating poor physical invoice quality.

---

## PART 12: FINAL VERDICT

**Is this now enterprise-grade?**
**Yes.** This architecture represents a mature, deterministic, and highly governable Master Data Management system. It perfectly balances the aggressive automation of Machine Learning with the strict, immutable safety rails of enterprise accounting.

**Would I deploy it for thousands of customers?**
**Yes.** Tenant isolation is guaranteed, storage explosion is mitigated via JSONB evidence packing, and automated learning is strictly guarded by maturity thresholds and RBAC governance.

### Remaining Weaknesses (Ranked by Severity)
1. **Severity Low:** The `pg_trgm` index size will grow significantly as millions of aliases are added. Memory tuning of the Postgres instance will be required in Year 3+.
2. **Severity Low:** Replaying history for Disaster Recovery on a tenant with 500,000 invoices will be computationally intensive and may require offline batch processing to avoid starving the primary database pool.

### Final Authorization
The architectural design phase is officially concluded. The system is conceptually sound, performant, and safe. Development and schema implementation may now begin based on the specifications detailed in Phase 131 and Phase 132.
