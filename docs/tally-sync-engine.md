# Tally Sync Engine

## Overview
The Tally Sync Engine represents the most critical bounded context in the platform. It ensures near real-time, bi-directional synchronization between the TallyMe database and the on-premise/cloud Tally Prime instance via XML/JSON payloads over Tally's HTTP API.

## Synchronization Lifecycle
1. **Queued:** The voucher draft is approved and enters the `SyncQueue`.
2. **Draft -> Syncing:** The `SyncWorker` constructs the precise Tally XML representation.
3. **Synced:** Tally Prime acknowledges the transaction and returns a `MASTERID` and `ALTERID`.
4. **Verified:** A background reconciliation job verifies the ledger balances match expectations post-sync.
5. **Modified/Resynchronized:** If a user edits the synced entity inside TallyMe, a modification XML is pushed using the `MASTERID`.

## Master Synchronization
To ensure AI pipelines route bills to correct ledgers, TallyMe continuously mirrors:
- **Ledgers & Groups**
- **Voucher Types**
- **Cost Centres & Cost Categories**
- **Stock Items & Godowns**

## Conflict Detection & Resolution
- **Detection:** Every SyncJob tracks the last known `ALTERID`. If Tally returns an error that the entity was modified externally, a conflict is raised.
- **Resolution:** Tally is the absolute source of truth. External modifications overwrite TallyMe records. The Accountant is notified via the `NotificationWorker`.

## Retry Strategies & Dead Letter Queue (DLQ)
- Transient errors (e.g., Tally server offline, network timeout) trigger an exponential backoff retry.
- Persistent errors (e.g., Invalid Ledger Name) route the payload to the DLQ. The Accountant must manually resolve the error mapping in the UI.

## Idempotency
Every payload pushed to Tally includes a unique GUID mapped to the `VoucherReference`. TDL scripts on the Tally side ensure that duplicate payloads are ignored.

## Audit Logs & Observability
- Every XML request and response is serialized and stored in the `AuditLogs` table.
- A Sync Status Dashboard provides accountants with visibility into pending syncs and DLQ errors.
