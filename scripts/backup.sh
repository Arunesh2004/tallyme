#!/bin/bash
# scripts/backup.sh
set -e

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILE_NAME="tallyme_db_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."
docker exec tallyme-postgres-1 pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > "$BACKUP_DIR/$FILE_NAME"

echo "Backup completed: $BACKUP_DIR/$FILE_NAME"

# Retention Policy: Keep last 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
echo "Old backups cleaned up."
