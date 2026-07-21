#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore.sh <path_to_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found at $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite the current database."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Starting database restore from $BACKUP_FILE..."

# Drop existing connections and restore
gunzip -c "$BACKUP_FILE" | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d tallyme

echo "Restore completed successfully."
