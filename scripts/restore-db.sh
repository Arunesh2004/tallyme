#!/bin/bash
# =============================================================================
# TallyMe Enterprise — PostgreSQL Restore Script
# =============================================================================
# Usage:
#   ./restore-db.sh <backup-file-path>
#
# Environment Variables:
#   DATABASE_URL - PostgreSQL connection URL (required)
# =============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"

# ---- Validation --------------------------------------------------------------
if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: $0 <backup-file-path>"
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL is not set."
  exit 1
fi

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Starting restore from: ${BACKUP_FILE}"
echo "[WARN] This will DROP and recreate the target database schema. Proceeding in 10 seconds..."
sleep 10

# ---- Decompress if gzipped ---------------------------------------------------
RESTORE_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  RESTORE_FILE="${BACKUP_FILE%.gz}"
  echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Decompressing backup..."
  gunzip -k "${BACKUP_FILE}" -c > "${RESTORE_FILE}"
fi

# ---- Perform restore ---------------------------------------------------------
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Running pg_restore..."
pg_restore \
  --dbname="${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  "${RESTORE_FILE}"

if [[ $? -eq 0 ]]; then
  echo "[$(date '+%Y-%m-%dT%H:%M:%S')] ✅ Restore completed successfully."
else
  echo "[ERROR] Restore failed. Check the logs above for details."
  exit 1
fi

# ---- Cleanup temp file -------------------------------------------------------
if [[ "${RESTORE_FILE}" != "${BACKUP_FILE}" ]]; then
  rm -f "${RESTORE_FILE}"
fi

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] ✅ Verification: run 'npm run prisma:validate' to confirm schema integrity."
