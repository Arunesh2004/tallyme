# TallyMe Enterprise — Disaster Recovery Guide

## 1. Database Recovery

### Restore from pg_dump backup
```bash
# Stop the application
docker compose down backend

# Restore database
pg_restore -h localhost -U tallyme -d tallymedb --clean backup-YYYY-MM-DD.dump

# Re-apply any migrations that occurred after the backup
npx prisma migrate deploy

# Restart
docker compose up -d backend
```

### Verify post-restore
```bash
npx prisma migrate status  # Should show: Database schema is up to date
```

---

## 2. Redis Recovery

Redis is configured with `appendonly yes` (AOF persistence). The queue data survives container restarts automatically.

If the AOF file is corrupted:
```bash
# Redis will refuse to start if AOF is corrupted. Fix with:
docker compose exec redis redis-check-aof --fix /data/appendonly.aof

# Restart Redis
docker compose restart redis
```

**BullMQ job recovery:** BullMQ stores all queue jobs in Redis. If Redis data is fully lost, in-flight `ERPSyncJob` records in PostgreSQL with `status = PENDING/SYNCING` will need to be manually re-queued or reset to `FAILED_TEMPORARY` via database update.

---

## 3. Application Recovery

```bash
# If container crashes
docker compose ps                 # Check container state
docker compose logs backend       # Identify crash reason
docker compose restart backend    # Restart container

# If image is corrupt
docker compose up --build -d      # Rebuild from source
```

---

## 4. Docker Volume Recovery

Persistent volumes are named:
- `tallyme-pgdata` — PostgreSQL data
- `tallyme-redisdata` — Redis AOF data
- `tallyme-uploads` — Uploaded invoice files

```bash
# List volumes
docker volume ls | grep tallyme

# Backup a volume
docker run --rm -v tallyme-pgdata:/data -v $(pwd):/backup \
  alpine tar czf /backup/pgdata-backup.tar.gz /data
```

---

## 5. Environment Restoration

If the server is rebuilt from scratch:
1. Restore `.env` from secure vault (never from git)
2. Restore database from `pg_dump` backup
3. Run `docker compose up --build -d`
4. Run `npx prisma migrate deploy` inside container
5. Verify health: `GET /system/health`

---

## 6. Tally Prime Reconnection

If Tally Prime moves to a new IP or port:
1. Update `TALLY_HOST` and `TALLY_PORT` in `.env`
2. Restart backend: `docker compose restart backend`
3. Verify connectivity: `GET /system/capabilities` → check Tally status
4. Retry any `FAILED_TEMPORARY` ERP sync jobs via admin panel

---

## 7. Backup Strategy

| Asset | Frequency | Method |
|---|---|---|
| PostgreSQL | Daily | `pg_dump` cron job |
| Redis AOF | Continuous | Automatic (appendonly) |
| Uploaded files | Daily | Volume backup or S3 sync |
| `.env` file | On change | Secure vault (e.g., AWS Secrets Manager) |
| Docker images | On release | Push to container registry |

---

## 8. RTO / RPO Targets (Recommended)

| Metric | Target |
|---|---|
| Recovery Time Objective (RTO) | < 2 hours |
| Recovery Point Objective (RPO) | < 24 hours (daily backup) |

> These are recommendations. Actual SLAs should be defined by the deployment team based on business requirements.
