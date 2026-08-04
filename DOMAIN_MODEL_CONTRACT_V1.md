# Domain Model Contract V1.0

This document is the single source of truth for the Vendor Master Management System (VMMS). It freezes the domain model, strictly enforcing the separation between Legal Identity, Physical Tax Identity, and Accounting Configuration.

## 1. Matching Responsibilities Flow
**Separation of Concerns:**
- **IDENTITY:** Solved by `Vendor` (PAN) and `VendorBranch` (GSTIN).
- **ACCOUNTING:** Solved by `Ledger Selection Policy` (Mapping physical expenses to chart of accounts).
- **ERP POSTING:** Solved by `VendorLedger` (The exact target ledger for voucher creation).

**The Final Validated Flow:**
```
OCR Extraction 
       ↓ 
Vendor Matching Engine (Evaluates Exact GSTIN, Names, and Aliases)
       ↓ 
[Match Found]
       ↓
Does Match point to a VendorLedger directly? (e.g., via Alias)
   ├── YES: Proceed to Voucher Builder.
   └── NO (Matched via GSTIN): Yields a VendorBranch.
             ↓
     Ledger Selection Policy (Evaluates expense type or default ledger config)
             ↓
     Yields VendorLedger
             ↓
     Voucher Builder & ERP Sync
```
*Why this is production-grade:* It decouples physical entity matching (GSTIN) from accounting policy (Cost Centers). 

---

## 2. Entity Definitions

### A. `Vendor`
1. **Represents:** The legal entity.
2. **Does NOT represent:** A physical office or an ERP ledger.
3. **Primary Key:** `id` (UUID).
4. **Canonical Identity:** `pan` (Unique per Company).
5. **Mutable Fields:** `legalName`, `status` (DRAFT, ACTIVE, INACTIVE, MERGED).
6. **Immutable Fields:** `createdAt`, `pan`.
7. **Relationships:** 1-to-N with `VendorBranch`. 1-to-N with `VendorAudit`.
8. **Lifecycle:** Created upon first invoice or MDM import. Evolved through merges.
9. **Accounting/Matching:** No direct role in matching or accounting (serves as MDM hierarchy root).

### B. `VendorBranch`
1. **Represents:** A physical tax registration in a specific state.
2. **Does NOT represent:** A cost center or ERP ledger.
3. **Primary Key:** `id` (UUID).
4. **Canonical Identity:** `gstin` (Strictly `@@unique([companyId, gstin])`).
5. **Mutable Fields:** `address`, `branchName`, `status`.
6. **Immutable Fields:** `vendorId`, `gstin`, `companyId`.
7. **Relationships:** Belongs to `Vendor`. Has 1-to-N `VendorLedger`s.
8. **Lifecycle:** Created when a new GSTIN is encountered. Deactivated if GSTIN is cancelled.
9. **Accounting/Matching:** The primary target of Stage 1 & 2 matching (Exact/Normalized GSTIN).

### C. `VendorLedger` (NEW)
*Validating the new entity:* Introducing `VendorLedger` perfectly resolves the Phase 133 semantic contradiction. It preserves GSTIN uniqueness while natively supporting complex enterprise cost-center accounting.
1. **Represents:** An actual accounting ledger in the ERP.
2. **Does NOT represent:** A physical supplier location.
3. **Primary Key:** `id` (UUID).
4. **Canonical Identity:** `erpLedgerCode` (Strictly `@@unique([companyId, erpLedgerCode])`).
5. **Mutable Fields:** `status`, `defaultExpenseCategory`.
6. **Immutable Fields:** `vendorBranchId`, `companyId`, `erpLedgerCode`.
7. **Relationships:** Belongs to `VendorBranch`. Has 1-to-N `VendorAlias`es.
8. **Lifecycle:** Created when the ERP syncs its Chart of Accounts to the MDM.
9. **Accounting/Matching:** The ultimate target of the matching pipeline. An alias must point here to automate accounting routing.

### D. `VendorAlias`
1. **Represents:** An automated routing rule mapping OCR anomalies directly to a ledger.
2. **Does NOT represent:** Master Data identity.
3. **Primary Key:** `id` (UUID).
4. **Canonical Identity:** `aliasText` (`@@unique([companyId, aliasText])`).
5. **Mutable Fields:** `successfulUses`, `reversals`, `maturityScore`, `status`, `lastUsedAt`.
6. **Immutable Fields:** `vendorLedgerId`, `companyId`, `aliasText`, `effectiveFrom`.
7. **Relationships:** Belongs to `VendorLedger` (NOT `VendorBranch`).
8. **Lifecycle:** Proposed via manual review. Matures automatically. Revoked manually.
9. **Accounting/Matching:** Bypasses standard identity matching; directly injects the `VendorLedger` into the Voucher Builder.

### E. `VendorMatchDecision`
1. **Represents:** The deterministic, auditable link between an Invoice and a Ledger.
2. **Does NOT represent:** A volatile prediction.
3. **Primary Key:** `id` (UUID).
4. **Canonical Identity:** `invoiceCandidateId` (`@@unique`).
5. **Mutable Fields:** `status` (ACTIVE -> REVERSED).
6. **Immutable Fields:** `selectedVendorLedgerId`, `isAutomated`, `matchEvidence` (JSONB), `marginDelta`.
7. **Relationships:** Belongs to `InvoiceCandidate` and `VendorLedger`.
8. **Lifecycle:** Created once matching completes. Immutable thereafter (only status changes to REVERSED on error).
9. **Accounting/Matching:** Explains exactly why the accounting engine chose this ledger.

### F. `VendorAudit`
1. **Represents:** The append-only Event Sourcing log for Master Data changes.
2. **Does NOT represent:** Application-level http trace logging.
3. **Primary Key:** `id` (UUID).
4. **Canonical Identity:** `id`.
5. **Mutable Fields:** None.
6. **Immutable Fields:** ALL (`changeType`, `oldPayload`, `newPayload`, `createdBy`, `createdAt`).
7. **Relationships:** Belongs to `Vendor` / `VendorBranch`.
8. **Lifecycle:** Inserted on MDM operations. Never deleted.

---

## 3. Backward Compatibility Guarantee (Phase A)
Phase A will introduce these models to the Prisma Schema **WITHOUT** breaking the existing Vendor Pipeline, Student Pipeline, Shared Accounting Engine, or ERP Sync.

**How:**
1. The existing `Vendor` model will **retain** its legacy fields (`gstin`, `pan`, `name`). We will not remove them in Phase A.
2. The existing `VendorMatcher` service (`apps/backend/src/modules/vendor-slip/domain/services/index.ts`) relies on `this.vendorRepo.findByGSTIN(gstin)`. Because the legacy `gstin` field remains, the query compiles and executes normally.
3. `InvoiceCandidate.document` and existing relations remain untouched.
4. The new relations (`VendorBranch`, `VendorLedger`, `VendorMatchDecision`) will be configured as non-breaking additions in Prisma.

**Affected Assets in Phase A:**
- `schema.prisma` (Additions only)
- `prisma/migrations` (New SQL creation script)
- NO services, NO workers, NO DTOs will be modified in Phase A.
