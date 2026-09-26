#!/usr/bin/env bash
set -e

# ==============================================================================
# Apex Institute LMS - Automated Production Database Backup Script
# Section 44: Automated scheduled backups with retention pruning
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-./database/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting automated database backup..."

if [ -n "$DATABASE_URL" ]; then
  # Dedicated PostgreSQL Server Mode
  echo "Executing pg_dump from PostgreSQL connection..."
  pg_dump "$DATABASE_URL" --format=custom --file="${BACKUP_FILE}"
  echo "Backup successfully written to: ${BACKUP_FILE}"
else
  # Embedded Application State Snapshot Mode
  echo "Executing application JSON state snapshot..."
  npm --prefix backend run backup || npx --prefix backend tsx src/scripts/backup.ts
fi

# Apply retention policy: delete snapshots older than RETENTION_DAYS
echo "Applying retention policy: purging snapshots older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "db_backup_*" -mtime "+${RETENTION_DAYS}" -exec rm -f {} \;

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database backup routine completed successfully."
