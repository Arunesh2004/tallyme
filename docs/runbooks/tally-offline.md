# TallyMe Runbook: Tally Gateway Offline

## Symptom
The `tallyme_erp_sync_failure_total` metric is spiking with the reason `ECONNREFUSED`. BullMQ `erp-sync` queue is backing up.

## Impact
No new vouchers are being pushed to Tally. Business operations are delayed.

## Immediate Action (Mitigation)
1. Do **not** flush the `erp-sync` queue. BullMQ is safely holding the jobs via exponential backoff.
2. Verify Tally Prime is running on the target Windows Server.
3. Verify the Tally Gateway port (default 9000) is open and reachable from the Docker network.
4. If Tally crashed, restart Tally Prime. 
5. The BullMQ worker will automatically resume pushing the queue once the connection is restored.

## Post-Mortem Checks
- Check the Windows Server event viewer for application crashes.
- Ensure the NGINX rate-limiting in `docker-compose.yml` is active to prevent the API from overwhelming Tally again.
