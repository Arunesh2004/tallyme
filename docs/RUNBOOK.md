# Operational Runbook - TallyMe Enterprise

## Incident: High Cron Lock Contention
**Alert:** `CronLockContentionHigh`
**Description:** Multiple worker pods are competing for cron locks. This usually means cron tasks are overlapping or taking too long.
**Resolution:**
1. Check Grafana dashboard for Worker CPU/Memory limits.
2. Check database transaction times.
3. Check if the cron frequency is too aggressive for the task execution time.

## Incident: Audit Logs Dropped
**Alert:** `AuditLogsDropped`
**Description:** The telemetry/audit pipeline failed to persist an audit log and dropped it.
**Resolution:**
1. This implies database connectivity issues or disk full on PostgreSQL.
2. Check `DatabaseDown` or `DatabaseHighConnections` alerts.

## Incident: Outbox Dead Letters High
**Alert:** `OutboxDeadLettersHigh`
**Description:** Events in the Transaction Outbox have exhausted all retries (5) and transitioned to `DEAD` state.
**Resolution:**
1. Query the database: `SELECT * FROM "TransactionOutbox" WHERE status = 'DEAD'`.
2. Observe the `errorMessage` column.
3. If the error was a transient external system outage (e.g., Tally Server was down longer than the backoff window), use the recovery API or trigger `OutboxRecoverySweeper` manually.

## Disaster Recovery Procedure
1. **Database Restoration:** Restore from the latest RDS automated backup (PITR).
2. **Redis Cache:** Redis data loss will wipe BullMQ. Restarting worker pods will re-process stranded Outbox entries into BullMQ via `OutboxRelayWorker`.
3. **Orphaned Drafts:** Stranded `TransactionDraft` objects can be manually moved to `QUEUED` via the Admin Portal to re-initiate processing.
