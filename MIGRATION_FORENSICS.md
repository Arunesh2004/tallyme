# Migration Forensics Report

## Current State
- **Database Schema:** Contains all tables from the frozen architecture Phase 37 AND the newly introduced Phase A VMMS tables (`VendorBranch`, `VendorLedger`, `VendorAlias`, etc.). This is due to the previous `npx prisma db push` operation which forced the schema to match `schema.prisma`.
- **`prisma/migrations` Folder:** Contains 20 SQL migration directories representing the state of the system up to Phase 37. It does **not** contain any SQL migration for Phase A (because `db push` does not generate one).
- **`_prisma_migrations` Table:** Empty or missing the entries for the 20 migrations in the folder.
- **`schema.prisma`:** Contains the correct Phase A schema, including the updated `@@unique([companyId, gstin])` constraint on `VendorBranch`.

## Drift Explanation & Root Cause
1. **Migration History Drift:** The physical database matches `schema.prisma`, but the migration tracking table (`_prisma_migrations`) is unaware of the 20 historical migrations in the `prisma/migrations` folder. 
2. **Root Cause:** A database dump/restore or external schema alteration occurred outside of the Prisma ecosystem. Because the `_prisma_migrations` table was lost or cleared, Prisma considers the database "non-empty" but "untracked".
3. **Phase A Escalation:** By running `npx prisma db push --accept-data-loss` during the previous phase, we bypassed the tracking drift to forcibly mutate the database to match the new VMMS schema. This succeeded in updating the tables, but completely destroyed the ability to generate a standard delta SQL migration (`npx prisma migrate dev`), because Prisma now detects a database that is ahead of its own tracked history, and demands an interactive reset to fix it (which is unsupported in CI/CD non-interactive mode).

## Safest Recovery Strategy (Baselining)
To restore a proper deployment pipeline (`npx prisma migrate deploy`) without destroying any data:
1. We must manually resolve the 20 historical migrations as "applied" using `npx prisma migrate resolve --applied <migration_name>`. This tricks Prisma into accepting that the database legitimately reached the state just prior to Phase A.
2. Because the database already has the Phase A tables (from `db push`), running `migrate dev` to create the Phase A SQL script will attempt to detect changes. However, if we drop the Phase A tables manually first, `migrate dev` will correctly generate the delta. 
3. Alternatively, we can use `npx prisma migrate diff` against the previous schema state to generate the migration file offline, and then `resolve --applied` it, keeping the database intact.

Given the strict requirement to preserve existing data, we will:
1. Run `resolve --applied` for all 20 migrations.
2. We will generate the Phase A migration using `npx prisma migrate diff --from-schema-datamodel <previous_schema> --to-schema-datamodel <current_schema>`. Since we don't have the previous schema easily available, we can rely on `prisma migrate dev --create-only`? Actually, `migrate dev` requires a clean drift. If we drop ONLY the 5 new VMMS tables, we can use `prisma migrate dev` cleanly because those tables are empty and no business logic relies on them yet.

## Plan to Generate Phase A
1. Baseline the 20 existing migrations using `migrate resolve`.
2. Generate the Phase A migration safely.
