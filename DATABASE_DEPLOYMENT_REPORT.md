# Database Deployment Report

## Migration Strategy
The `npx prisma db push` command utilized during local development is strictly **PROHIBITED** in production, as it can forcefully overwrite structural dependencies resulting in immediate data loss.

## Production Workflow
1. **Schema Finalization**: In dev, run `npx prisma migrate dev --name <change>` to generate deterministic SQL migration artifacts inside `/prisma/migrations`.
2. **Commit**: These artifacts must be version controlled into the Git repository.
3. **Backup Requirement**: **MANDATORY**. A full PostgreSQL Point-In-Time-Recovery (PITR) snapshot or `pg_dump` must be taken on the RDS host prior to execution.
4. **Deploy**: The deployment pipeline will natively run `npx prisma migrate deploy`.

## Pipeline Execution
`migrate deploy` operates without user interaction. It resolves the `_prisma_migrations` tracking table and sequentially executes only the required un-run SQL artifacts. If an error occurs, the transaction will rollback automatically.
