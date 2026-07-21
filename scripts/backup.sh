#!/bin/bash
set -e

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/tallyme_db_$TIMESTAMP.sql.gz"

echo "Starting database backup..."
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres -d tallyme | gzip > "$BACKUP_FILE"

echo "Backup completed successfully: $BACKUP_FILE"
