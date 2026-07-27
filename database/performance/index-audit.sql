-- TallyMe Enterprise Reliability - Index Performance Audit Script
-- Run this script to analyze missing indexes and sequential scans

SELECT 
    relname AS table_name,
    seq_scan AS sequential_scans,
    seq_tup_read AS tuples_read_sequentially,
    idx_scan AS index_scans,
    idx_tup_fetch AS tuples_fetched_via_index
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Analyze specific tables for missing indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'VoucherCandidate',
    'Document',
    'ApprovalRequest',
    'MigrationExecution',
    'ERPSyncJob'
);
