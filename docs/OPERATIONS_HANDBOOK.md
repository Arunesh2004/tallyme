# TallyMe Enterprise - Operations Handbook

## 1. Incident Response Procedures

### 1.1 Tally ERP Disconnected
**Symptom**: `erpSyncFailure` metric spikes. `TALLY_HOST` health check (`/api/health/ready`) shows `DOWN`.
**Action**:
1. Check if Tally Prime is running on the designated host machine.
2. Verify the Tally API port (default `9000`) is accessible from the backend container (`curl -I http://TALLY_HOST:9000`).
3. If running, restart the Tally Prime application.
4. Vouchers in `FAILED_PERMANENT` state can be re-queued from the Admin Dashboard once the connection is restored.

### 1.2 Redis Outage
**Symptom**: High API latency or `500` errors on endpoints utilizing idempotency or BullMQ workers stalling.
**Action**:
1. Check `docker-compose ps` for Redis status.
2. Restart Redis: `docker-compose restart redis`.
3. Check Redis logs for OOM (Out Of Memory) issues. If OOM, increase `maxmemory` in `redis.conf`.

### 1.3 Database High Load
**Symptom**: `tallyme_voucher_generation_latency_seconds` spikes. Database CPU > 80%.
**Action**:
1. Connect to PostgreSQL and run `SELECT * FROM pg_stat_activity WHERE state = 'active';` to find long-running queries.
2. Scale up the database instance (if on RDS/managed service).
3. If caused by a backlog of background jobs, temporarily scale down `backend-worker` replicas to reduce DB connection pressure.

## 2. Backup & Restore Procedures

### 2.1 Performing a Manual Backup
Execute the provided backup script on the host machine:
```bash
./scripts/backup.sh
```
This generates a timestamped `.sql.gz` dump in the `/backups` directory.

### 2.2 Disaster Recovery (Restore)
> [!CAUTION]
> Restoring a backup will overwrite the current database state.

1. Stop all workers and API containers:
   ```bash
   docker-compose stop backend-api backend-worker
   ```
2. Run the restore script:
   ```bash
   ./scripts/restore.sh /path/to/backup_file.sql.gz
   ```
3. Run smoke tests (see section 3).
4. Restart containers: `docker-compose start`

## 3. Disaster Recovery Drill Verification

After a restore, verify the following:
- Hit `/api/health` to ensure DB connectivity.
- Verify `VoucherCandidate` records match the expected backup date.
- Perform a manual sync of a test voucher to Tally to verify ERP connectivity.
