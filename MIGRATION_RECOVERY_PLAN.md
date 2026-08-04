# Migration Recovery Plan

## Current State & Blocker
The implementation of a proper SQL migration workflow for Phase A is **blocked** due to severe migration history drift. 

1. **Unapplied Migrations:** There are 20 unapplied migrations in `prisma/migrations` (from `20260724130409_phase19_init` to `20260725065554_phase37_enterprise_reliability`).
2. **Non-Empty Database:** The database already contains tables (partially from previous states, and partially from our recent `npx prisma db push`).
3. **Non-Interactive Environment:** Because the environment is non-interactive, `npx prisma migrate dev` fails immediately when it detects drift. It cannot prompt for a database reset or data loss confirmation.
4. **Deploy Restriction:** `npx prisma migrate deploy` fails with "The database schema is not empty" because the internal `_prisma_migrations` table does not have a baseline record reflecting the existing tables.

Because strict instructions state *"Do NOT destroy existing data unless absolutely required"* and forbid inventing workarounds, I cannot safely clear this drift without explicit approval.

## Proposed Recovery Steps

We must resolve the drift without destroying the database. 

**Step 1: Baseline the Database**
Because the 20 migrations represent the schema *before* our Phase A changes, and the database already structurally matched those migrations prior to our `db push`, we must trick Prisma into accepting them as applied.
We will execute the following for **each** of the 20 migrations:
```bash
npx prisma migrate resolve --applied 20260724130409_phase19_init
# ... repeat for all 20 migrations
```
*Impact:* This populates `_prisma_migrations` without executing the SQL, satisfying Prisma's history checks.

**Step 2: Generate the Phase A SQL Migration (init_vmms)**
Because we previously ran `db push` to apply the Phase A changes directly to the database, `npx prisma migrate dev --name init_vmms` might now detect that the database schema is ahead of the migration history and prompt for a reset.
To safely extract the migration without resetting:
```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260729_init_vmms/migration.sql
```
*Wait, comparing to empty generates the ENTIRE schema.*
We should instead diff against the previous schema, or temporarily drop the Phase A tables, run `migrate dev`, and let it generate the delta.

**Alternative (If Dev Data IS Disposable):**
If this environment's database can be safely wiped:
```bash
npx prisma db push --force-reset
npx prisma migrate dev --name init_vmms
```

**Approval Required:**
Please advise if we should proceed with Baselining (Step 1 & 2) to preserve data, or if a Force Reset is acceptable for this environment.
