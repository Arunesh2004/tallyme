# Phase A Implementation Audit

## 1. Schema.prisma vs Domain Model Contract
The implementation diverges from the strict constraints of the `DOMAIN_MODEL_CONTRACT_V1.md`. Specifically, the domain model resolved the semantic ambiguity of `VendorBranch` by introducing `VendorLedger`, which mandated that `VendorBranch` strictly represents a legal tax registration with a mathematically unique GSTIN. 

The implementation incorrectly preserved the `@@index([companyId, gstin])` downgrade from a previous schema review iteration, instead of restoring the `@@unique` constraint.

## 2. Verify VendorBranch (GSTIN Uniqueness)
- **Contract Mandate:** `VendorBranch` = GST Registration. GSTIN must remain unique (`@@unique([companyId, gstin])`).
- **Implementation:** **FAIL.** 
  - `schema.prisma` lines 122 uses: `@@index([companyId, gstin])`. 
  - This allows duplicate GSTIN branches, re-introducing the fatal semantic contradiction that the architecture explicitly solved.

## 3. Verify VendorLedger
- **Relationships:** Links to `VendorBranch`, `Company`, `VendorAlias`, `VendorMatchDecision`. **PASS.**
- **Foreign Keys:** Handled correctly via Prisma. **PASS.**
- **Constraints:** `@@unique([companyId, erpLedgerCode])`. **PASS.**
- **Indexes:** `@@index([companyId])`, `@@index([vendorBranchId])`. **PASS.**

## 4. Verify VendorAlias
- **Target:** Points strictly to `VendorLedger` (via `vendorLedgerId`), completely bypassing `VendorBranch` as defined by the accounting flow. **PASS.**

## 5. Verify VendorMatchDecision
- **Target:** Targets `VendorLedger` (via `selectedVendorLedgerId`). **PASS.**

## 6. Verify VendorAudit
- Implemented as an append-only log with JSONB payloads. **PASS.**

## 7. Verify Every Index
- Added B-Tree isolation indexes on all foreign keys (`companyId`, `vendorBranchId`, `vendorLedgerId`). **PASS.**
- EXCEPT: The GSTIN composite index on `VendorBranch` is functionally incorrect.

## 8. Verify Every Unique Constraint
- `VendorLedger.erpLedgerCode` -> Unique per company. **PASS.**
- `VendorAlias.aliasText` -> Unique per company. **PASS.**
- `VendorBranch.gstin` -> **MISSING.**

## 9. Prisma Migrate vs DB Push
- **Why `prisma migrate` was not used:** The local database environment contained 20 unapplied migrations (database drift). Prisma's `migrate dev` command blocked execution because it detected a non-interactive environment and could not prompt the user for data-loss or reset confirmation.
- **Why `db push` was used:** It bypasses migration history checks and forces the database to match the current schema.
- **Violation:** **FAIL.** This strictly violates the `IMPLEMENTATION_ROADMAP_V2.md`. The roadmap requires the creation of migration SQL scripts (`prisma/migrations`) to ensure an irreversible, testable, and strictly audited deployment across all staging/production environments.

## 10. Verify Rollback Strategy
- **Does a migration exist?** **NO.** Only the schema file was updated. 
- **Consequence:** Because there is no generated SQL migration, we cannot utilize standard rollback tools (`prisma migrate diff` or down migrations). The rollback strategy documented in the Phase A report ("Run `npx prisma db push` to drop new tables") is dangerous and untestable for production deployment pipelines.

---

## REQUIRED CORRECTIONS BEFORE PHASE B

1. **Modify `schema.prisma`:** Replace `@@index([companyId, gstin])` with `@@unique([companyId, gstin])` on the `VendorBranch` model.
2. **Generate Migration File:** We MUST successfully run a command that outputs the physical SQL migration files into the `prisma/migrations` folder to satisfy the roadmap. (e.g., using `prisma migrate diff` directed to a `.sql` file, or resolving the DB drift to allow `migrate dev`).

---

## FINAL VERDICT
FAIL
