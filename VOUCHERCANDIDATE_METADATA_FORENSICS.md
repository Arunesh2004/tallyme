# VoucherCandidate.metadata Forensics

## 1. Which historical migration SHOULD have introduced it?
No historical migration introduced it. A grep analysis of all 20 historical migrations in `prisma/migrations` confirms that `metadata JSONB` was created for other tables (e.g., `VendorSlipAudit`, `SyncOperationEvent`), but NEVER for `VoucherCandidate`. 

## 2. Did the field exist in schema.prisma before Phase A?
**Yes.** The `schema.prisma` file contained `metadata Json?` on the `VoucherCandidate` model prior to the start of Phase A. This proves that a previous developer modified the schema but failed to generate a corresponding SQL migration.

## 3. Did the field already exist in the live database?
**Yes.** Because the previous environment relied on `npx prisma db push` (which bypasses migration history and syncs the database directly to the schema), the live database had already materialized the `metadata` column. This is the exact root cause of the "untracked" database drift we encountered earlier.

## 4. Why did prisma migrate diff generate it inside init_vmms?
During the Phase A baselining strategy, we built a pristine `shadow_tallyme` database strictly from the 20 historical SQL migrations. Because the historical SQL migrations lacked the `metadata` column, the shadow database lacked it. We then executed `prisma migrate diff` comparing this pristine shadow database to the current `schema.prisma`. Prisma correctly identified that the shadow database was missing the `metadata` column and automatically appended the necessary `ALTER TABLE` command into the Phase A delta.

## 5. Does this indicate historical migration drift?
**Yes.** This provides concrete forensic evidence that historical migration drift occurred prior to Phase A. Someone edited `schema.prisma` and used `db push` without committing a migration, breaking the deployment pipeline.

## 6. Will a future clean deployment produce exactly the same schema?
**Yes.** The migration chain is now fully self-healing and mathematically intact. 
When another developer runs `prisma migrate deploy` on a brand-new database:
1. Migrations 1-20 will execute, creating `VoucherCandidate` without the `metadata` column.
2. The `init_vmms` migration will execute, successfully applying the `ALTER TABLE "VoucherCandidate" ADD COLUMN "metadata" JSONB;` command.
3. The final database schema will perfectly match the expected state.

## Conclusion
The inclusion of the `VoucherCandidate.metadata` column inside the `init_vmms` migration is not a mistake. It is the successful, automatic remediation of previous historical drift by the Prisma diff engine. The migration chain is completely repaired.
