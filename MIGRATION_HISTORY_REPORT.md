# Migration History Report

## Database Integration
As mandated in Phase 7, the `MigrationHistory` table has been added to `schema.prisma`. 
This allows TallyMe to maintain a permanent ledger of every Master Data modification created remotely in the ERP.

## Structure Captured
The table successfully records:
- `migrationId`: For grouping batch operations together.
- `operation`: e.g. 'CREATE', 'ALTER'.
- `objectType`: 'GROUP', 'LEDGER', 'COST_CATEGORY', 'COST_CENTRE'
- `objectName`: The exact Tally string identifier.
- `rollbackSupported`: Boolean to indicate safety limits.

## Rollback Policy Enforcement
The `POST /tally/migration/:id/rollback` API enforces the Phase 8 requirements exactly. It NEVER initiates an automated XML `<DELETE>` command because deleting Master Data that has already been attached to a Voucher can fatally corrupt a Tally Company file. 
Instead, it:
1. Reverts TallyMe's internal tracking maps.
2. Identifies the specific objects created.
3. Surfaces them in an explicit `cleanupRecommendations` array so that a human Accountant can safely verify their emptiness inside Tally before manually purging them.
