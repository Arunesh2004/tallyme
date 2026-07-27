# TallyMe Enterprise — Backup & Restore Guide

## Backup Automation

### Setup

Configure the following environment variables before running:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | — | PostgreSQL connection URL |
| `BACKUP_DIR` | ✅ Yes | `/backups` | Local backup directory |
| `BACKUP_RETENTION_DAYS` | No | `7` | Days to retain local backups |
| `S3_BACKUP_ENABLED` | No | `false` | Enable S3 upload |
| `S3_BUCKET` | If S3 | — | S3 bucket name |
| `AWS_REGION` | If S3 | `ap-south-1` | AWS region |

### Running a Backup

```bash
# Manual backup
./scripts/backup-db.sh

# Scheduled (add to crontab for daily 2 AM backup)
0 2 * * * /opt/tallyme/scripts/backup-db.sh >> /var/log/tallyme-backup.log 2>&1
```

### Backup File Format

Backups are saved as: `tallyme_YYYYMMDD_HHMMSS.sql.gz`

Each backup is verified using `pg_restore --list` before being declared successful.

---

## Restore Procedure

### Pre-restore Checklist

- [ ] Confirm the correct backup file to restore
- [ ] Notify stakeholders of planned downtime
- [ ] Scale down API and Worker pods to 0
- [ ] Take a snapshot of the current DB (for rollback)

### Running a Restore

```bash
./scripts/restore-db.sh /backups/tallyme_20260722_020000.sql.gz
```

> ⚠️ The restore script will DROP and recreate the database schema. You have a 10-second window to abort.

### Post-restore Verification

```bash
# 1. Confirm schema integrity
npx prisma validate

# 2. Run the data audit
npx ts-node scripts/validate_automations.js

# 3. Check health endpoints
curl https://api.tallyme.com/api/v1/health/ready
```

---

## Disaster Recovery

### RTO (Recovery Time Objective): 2 hours
### RPO (Recovery Point Objective): 24 hours (1 backup per day)

For sub-hour RPO requirements, configure WAL (Write-Ahead Log) streaming replication in PostgreSQL.

### Rollback Procedure

If a restore causes further issues:

1. Stop all services.
2. Restore from the pre-restore snapshot (taken in the pre-restore checklist).
3. Verify with health checks.
4. Scale up API and Worker pods.
