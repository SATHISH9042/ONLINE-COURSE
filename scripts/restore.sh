#!/usr/bin/env bash
set -e

# ==============================================================================
# Apex Institute LMS - Production Database Restore Script
# Section 44: Database disaster recovery and state restoration
# ==============================================================================

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore.sh <path_to_backup_file>"
  echo "Example: ./scripts/restore.sh ./database/backups/db_backup_20260927_120000.json"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoring database from: $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.sql ]]; then
  if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL must be defined to restore SQL dump."
    exit 1
  fi
  pg_restore --clean --if-exists -d "$DATABASE_URL" "$BACKUP_FILE"
elif [[ "$BACKUP_FILE" == *.json ]]; then
  npx --prefix backend tsx src/scripts/backup.ts --restore "$BACKUP_FILE"
else
  echo "Error: Unrecognized backup file format. Expected .sql or .json"
  exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database restored successfully."
