# Phase 130 - Vendor Master Management System (VMMS) Architecture

## 1. Executive Summary
This document defines the production-grade architecture for the Vendor Master Management System (VMMS) and the Vendor Matching Engine. The architecture is designed to handle enterprise-level complexities such as branches, mergers, name changes, and continuous automated learning, guaranteeing zero incorrect ledger postings while maximizing straight-through processing (STP).

## 2. Production Questions & Architectural Decisions

### Continuous Learning & Automation
1. **Should Vendor Matching be stateless or self-learning?**
   **Self-learning.** Stateless matching hits a ceiling. The system must utilize human manual review decisions to build a knowledge base, automating future occurrences of the same OCR anomalies.
2. **Should aliases be manually maintained or automatically learned?**
   **Automatically learned, but cautiously promoted.** When a human manually maps "SBD" to "Siddhi Book Depot", the system records a pending alias.
3. **Should manual review permanently improve future automation?**
   **Yes**, but governed by a maturity model. A single manual review creates a "Low Confidence" alias. Multiple identical manual reviews, or an explicit "Save as Alias" toggle by the accountant, promotes it to "High Confidence."
4. **How should we prevent bad learning?**
   By implementing a `Learning Maturity Score`. A single manual mapping does not immediately automate the next invoice; it merely suggests it. Only when an alias reaches a maturity threshold (e.g., confirmed 3 times) does it automate. Bad learning is prevented by tracking the exact user who mapped it.
5. **Should confidence scores evolve over time?**
   **Yes.** An alias matched successfully 100 times without reversal gains a 99% confidence score, rivaling an Exact Name match.

### Identity & Entity Lifecycle
6. **Should the system maintain historical identities?**
   **Yes.** An invoice from 2022 mapped to an old GSTIN must remain historically intact, even if the vendor changed their GSTIN in 2024.
7. **Should every vendor have a canonical internal UUID independent of GSTIN?**
   **Absolutely.** GSTIN, PAN, and Names are mutable attributes (due to business restructuring). The system's canonical anchor must be a purely internal, immutable UUID.
8. **How should branch offices be represented?**
   A parent `Vendor` entity (representing the legal company/PAN) with multiple `VendorBranch` entities (representing states/GSTINs). Invoices map to the *Branch*, not the Parent.
9. **Should aliases be versioned?**
   **Yes.** Aliases must have `createdAt`, `createdBy`, `revokedAt`, and `revokedBy` to maintain a strict audit trail of automation rules.
10. **How should vendor master merges be handled?**
    Target branch ledgers are repointed to the surviving Parent UUID. Historical invoices remain untouched. Future invoices automatically resolve to the surviving entity.
11. **How should vendor master splits be handled?**
    New Vendor UUIDs are created. The old entity is marked `INACTIVE`. New aliases are created pointing to the split entities.
12. **How should deleted vendors affect historical invoices?**
    Vendors are never physically deleted (Soft Delete only). Historical invoices retain their foreign keys perfectly.

### Auditability & Safety
13. **How should confidence be audited?**
    Every match generates a `VendorMatchEvidence` record, explicitly stating the points awarded for each stage (e.g., "Normalized Name: +85, Address Match: +5").
14. **How should every automatic match be explainable?**
    Through a `VendorMatchDecision` record linking the Invoice, the Evidence, the matched Branch, and the Delta score. The UI can display: *"Matched via Alias 'Shree Trdrs' (Score: 90). Next best match was 45. Margin safe."*
15. **How should manual overrides be recorded?**
    The `VendorMatchDecision` records `status = MANUAL`, `resolvedBy = UserID`, and captures the originally suggested system match for delta analysis.
16. **How should rollback work if an incorrect mapping is discovered six months later?**
    The `VendorMatchDecision` is flagged as `REVERSED`. The `VendorLearning` engine immediately penalizes the rule that caused the bad match, returning it to Manual Review status. ERP synchronization issues an amendment or reversal voucher.
17. **How can the system continuously improve without ever risking incorrect ledger postings?**
    By utilizing the **Delta > 10 Rule** combined with the **Learning Maturity Model**. No matter how high a learned score is, if it collides closely with another ledger, the system halts.

---

## 3. Entity-Relationship Model (VMMS)

The architecture splits the concept of a "Vendor" into highly normalized, purpose-built domains.

### 1. `Vendor` (The Legal Entity)
**Responsibility**: Represents the overarching legal business entity. Anchored by PAN.
- `id`: UUID (Primary Key)
- `pan`: String (Unique, Nullable)
- `legalName`: String
- `status`: ACTIVE, MERGED, INACTIVE

### 2. `VendorBranch` (The Transacting Entity)
**Responsibility**: Represents the specific state registration or billing unit. Anchored by GSTIN and ERP Ledger Code. Invoices map to THIS entity.
- `id`: UUID (Primary Key)
- `vendorId`: UUID (Foreign Key)
- `gstin`: String (Unique, Nullable)
- `erpLedgerCode`: String (Unique)
- `branchName`: String (e.g., "Shree Traders - Maharashtra")
- `address`: JSON

### 3. `VendorAlias` (The Identification Rule)
**Responsibility**: Maps variations, abbreviations, and OCR anomalies to a specific Branch.
- `id`: UUID
- `vendorBranchId`: UUID (Foreign Key)
- `aliasText`: String (e.g., "M/S SHRE TRDERS")
- `normalizationType`: EXACT, STRIPPED, REGEX
- `isSystemGenerated`: Boolean

### 4. `VendorLearning` (The Automation Maturation Engine)
**Responsibility**: Tracks how many times a manual override or alias has been successfully used to dictate when it crosses the threshold into automatic straight-through processing.
- `id`: UUID
- `vendorAliasId`: UUID
- `successfulUses`: Int
- `reversals`: Int
- `maturityScore`: Float (0.0 to 1.0)
- `status`: LEARNING, AUTOMATED, REVOKED

### 5. `VendorMatchEvidence` (The Explainability Layer)
**Responsibility**: A transient/immutable record storing exactly *why* a specific invoice scored what it did against a specific branch.
- `id`: UUID
- `invoiceCandidateId`: UUID
- `vendorBranchId`: UUID
- `stageMatched`: String (e.g., "STAGE_4_NORMALIZED_NAME")
- `rawScore`: Float
- `contextData`: JSON (e.g., `{ "ocrText": "Shre Trdrs", "dbText": "Shree Traders", "levenshtein": 8 }`)

### 6. `VendorMatchDecision` (The Final Outcome)
**Responsibility**: The definitive bridge between an Invoice and a Vendor Branch.
- `id`: UUID
- `invoiceCandidateId`: UUID (Unique)
- `selectedVendorBranchId`: UUID
- `isAutomated`: Boolean
- `winningEvidenceId`: UUID (Foreign Key to Evidence)
- `marginDelta`: Float (The gap between #1 and #2 matches)
- `resolvedByUserId`: UUID (If manual)
- `status`: ACTIVE, REVERSED

### 7. `VendorAudit` & `VendorHistory`
**Responsibility**: Tracks Master Data changes (Type 2 SCD). If a branch changes its GSTIN, a new record is inserted, and the old is end-dated.
- `vendorBranchId`: UUID
- `changeType`: String
- `oldValue`: JSON
- `newValue`: JSON
- `effectiveFrom`: DateTime
- `effectiveTo`: DateTime

---

## 4. Lifecycle & Workflows

### The Match Execution Workflow
1. **Extraction**: OCR pulls raw fields.
2. **Evidence Generation**: The engine evaluates the Invoice against the `VendorBranch` and `VendorAlias` tables. It generates `VendorMatchEvidence` records for all potential hits.
3. **Scoring & Delta**: The engine calculates the highest score and the delta to the runner-up.
4. **Decision Routing**:
   - If `Score >= 85` AND `Delta > 10` AND `Alias Maturity == AUTOMATED`: Create `VendorMatchDecision` (isAutomated=true).
   - Else: Create `VendorMatchDecision` (isAutomated=false, status=PENDING_REVIEW).

### The Learning Cycle Workflow
1. **Manual Intervention**: Accountant reviews a pending invoice, sees OCR extracted "Mehta Trdrs", and manually selects the "Mehta Traders" ledger.
2. **Knowledge Capture**: The system creates a `VendorAlias` for "Mehta Trdrs" linked to that ledger, and a `VendorLearning` record initialized at `successfulUses = 1`, `status = LEARNING`.
3. **Maturation**: The next time "Mehta Trdrs" appears, it scores highly, but because status is `LEARNING`, it forces manual review again. The accountant confirms it. `successfulUses` becomes 2.
4. **Automation Achieved**: Upon reaching the threshold (e.g., 3 uses), `status` upgrades to `AUTOMATED`. The 4th occurrence flows straight through to the ERP without human touch.
5. **Reversal / Punishment**: If an accountant ever marks a past decision as incorrect, the `VendorLearning.reversals` increments, dropping the maturity score and immediately revoking the automation privilege.

### Database Indexing Strategy
- **Primary Lookups**: B-Tree indices on `VendorBranch.gstin`, `Vendor.pan`, `VendorBranch.erpLedgerCode`.
- **Alias Lookups**: Hash index on `VendorAlias.aliasText` (lowercased/normalized).
- **Fuzzy Lookups (If required)**: `pg_trgm` GIN index on `VendorBranch.branchName` to support fast similarity scoring without full table scans.

## 5. Conclusion
This architecture completely eliminates the fragility of the strict GSTIN-only pipeline. By normalizing data, introducing aliases, separating legal entities from billing branches, and wrapping the entire system in a robust, explainable, and accountable machine-learning lifecycle, the application achieves true enterprise-grade Vendor Management.
