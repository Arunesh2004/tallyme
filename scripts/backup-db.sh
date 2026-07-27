#!/bin/bash
# =============================================================================
# TallyMe Enterprise — PostgreSQL Production Backup Script
# =============================================================================
# Configuration via Environment Variables:
#   BACKUP_DIR            - Local backup directory (required, default: /backups)
#   BACKUP_RETENTION_DAYS - Number of days to keep local backups (default: 7)
#   DATABASE_URL          - PostgreSQL connection URL (required)
#   S3_BACKUP_ENABLED     - Enable S3 upload (true/false, default: false)
#   S3_BUCKET             - S3 bucket name (required if S3_BACKUP_ENABLED=true)
#   AWS_REGION            - AWS region (required if S3_BACKUP_ENABLED=true)
# =============================================================================

set -euo pipefail

# ---- Configuration ----------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
S3_BACKUP_ENABLED="${S3_BACKUP_ENABLED:-false}"
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/tallyme_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# ---- Validation --------------------------------------------------------------
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL is not set. Aborting backup."
  exit 1
fi

if [[ "${S3_BACKUP_ENABLED}" == "true" && -z "${S3_BUCKET}" ]]; then
  echo "[ERROR] S3_BACKUP_ENABLED is true but S3_BUCKET is not set. Aborting."
  exit 1
fi

# ---- Create backup directory -------------------------------------------------
mkdir -p "${BACKUP_DIR}"
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Starting TallyMe PostgreSQL backup..." | tee "${LOG_FILE}"

# ---- Perform backup ----------------------------------------------------------
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Running pg_dump..." | tee -a "${LOG_FILE}"
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --verbose 2>>"${LOG_FILE}" | gzip -9 > "${BACKUP_FILE}"

if [[ $? -ne 0 ]]; then
  echo "[ERROR] pg_dump failed. Check log: ${LOG_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})" | tee -a "${LOG_FILE}"

# ---- Verify backup integrity -------------------------------------------------
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Verifying backup integrity..." | tee -a "${LOG_FILE}"
pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1
if [[ $? -ne 0 ]]; then
  echo "[ERROR] Backup verification failed. The backup file may be corrupted."
  exit 1
fi
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Backup integrity verified." | tee -a "${LOG_FILE}"

# ---- Upload to S3 (optional) -------------------------------------------------
if [[ "${S3_BACKUP_ENABLED}" == "true" ]]; then
  S3_PATH="s3://${S3_BUCKET}/tallyme/postgres/${TIMESTAMP}/$(basename ${BACKUP_FILE})"
  echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Uploading to S3: ${S3_PATH}..." | tee -a "${LOG_FILE}"
  
  aws s3 cp "${BACKUP_FILE}" "${S3_PATH}" \
    --region "${AWS_REGION}" \
    --storage-class STANDARD_IA \
    --server-side-encryption AES256 2>>"${LOG_FILE}"

  if [[ $? -eq 0 ]]; then
    echo "[$(date '+%Y-%m-%dT%H:%M:%S')] S3 upload successful: ${S3_PATH}" | tee -a "${LOG_FILE}"
  else
    echo "[ERROR] S3 upload failed. Local backup is still available at: ${BACKUP_FILE}"
    exit 1
  fi
fi

# ---- Prune old backups (local) -----------------------------------------------
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Pruning backups older than ${BACKUP_RETENTION_DAYS} days..." | tee -a "${LOG_FILE}"
find "${BACKUP_DIR}" -name "tallyme_*.sql.gz" -mtime +${BACKUP_RETENTION_DAYS} -exec rm -v {} \; 2>>"${LOG_FILE}" || true

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] ✅ Backup completed successfully." | tee -a "${LOG_FILE}"
