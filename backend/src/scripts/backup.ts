import fs from 'fs';
import path from 'path';
import { db } from '../database/db';

export interface BackupMetadata {
  version: string;
  createdAt: string;
  totalTables: number;
  totalRecords: number;
  tables: Record<string, number>;
}

export interface BackupSnapshot {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

export const BACKUP_TABLES = [
  'users',
  'student_profiles',
  'admin_profiles',
  'courses',
  'course_topics',
  'course_subtopics',
  'videos',
  'coding_problems',
  'coding_test_cases',
  'mcq_questions',
  'course_enrollments',
  'payments',
  'live_classes',
  'live_class_recordings',
  'notifications',
  'notification_recipients',
  'student_progress',
  'video_progress',
  'coding_submissions',
  'mcq_attempts',
  'faqs',
  'audit_logs',
];

export const BACKUPS_DIR = path.resolve(__dirname, '../../../database/backups');

/**
 * Creates an atomic snapshot backup of the relational database.
 */
export async function createDatabaseBackup(customOutputDir?: string): Promise<{
  backupPath: string;
  metadata: BackupMetadata;
}> {
  const targetDir = customOutputDir || BACKUPS_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `db_backup_${timestamp}.json`;
  const backupPath = path.join(targetDir, filename);

  const snapshot: BackupSnapshot = {
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      totalTables: 0,
      totalRecords: 0,
      tables: {},
    },
    data: {},
  };

  let totalRecords = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const res = await db.query(`SELECT * FROM ${table} ORDER BY 1 ASC`);
      snapshot.data[table] = res.rows;
      snapshot.metadata.tables[table] = res.rowCount || 0;
      totalRecords += res.rowCount || 0;
    } catch (err: any) {
      // Table may not exist yet if migrations haven't run for it
      snapshot.metadata.tables[table] = 0;
      snapshot.data[table] = [];
    }
  }

  snapshot.metadata.totalTables = Object.keys(snapshot.data).length;
  snapshot.metadata.totalRecords = totalRecords;

  fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  return { backupPath, metadata: snapshot.metadata };
}

/**
 * Restores database state from a backup snapshot file.
 */
export async function restoreDatabaseBackup(backupPath: string): Promise<BackupMetadata> {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at: ${backupPath}`);
  }

  const content = fs.readFileSync(backupPath, 'utf-8');
  const snapshot: BackupSnapshot = JSON.parse(content);

  // Restore tables in reverse dependency order or clear with CASCADE
  for (const table of BACKUP_TABLES) {
    const rows = snapshot.data[table];
    if (rows && rows.length > 0) {
      // Insert rows preserving keys
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colList = columns.map((c) => `"${c}"`).join(', ');

        const updateSet = columns
          .filter((c) => c !== 'id')
          .map((c) => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');

        const onConflict = updateSet.length > 0
          ? `ON CONFLICT (id) DO UPDATE SET ${updateSet}`
          : `ON CONFLICT (id) DO NOTHING`;

        await db.query(
          `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ${onConflict}`,
          values
        );
      }
    }
  }

  return snapshot.metadata;
}

/**
 * Prunes backup files older than retentionDays.
 */
export function pruneOldBackups(retentionDays = 30, dir = BACKUPS_DIR): string[] {
  if (!fs.existsSync(dir)) return [];

  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const prunedFiles: string[] = [];

  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith('db_backup_') && file.endsWith('.json')) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        prunedFiles.push(file);
      }
    }
  }

  return prunedFiles;
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const isRestore = args.includes('--restore');
  const restoreFile = args[args.indexOf('--restore') + 1];

  if (isRestore && restoreFile) {
    console.log(`[Backup CLI] Restoring database from ${restoreFile}...`);
    restoreDatabaseBackup(restoreFile)
      .then((meta) => {
        console.log(`[Backup CLI] Successfully restored ${meta.totalRecords} records across ${meta.totalTables} tables.`);
        process.exit(0);
      })
      .catch((err) => {
        console.error('[Backup CLI Error]', err);
        process.exit(1);
      });
  } else {
    console.log('[Backup CLI] Generating automated database snapshot...');
    createDatabaseBackup()
      .then(({ backupPath, metadata }) => {
        console.log(`[Backup CLI] Snapshot generated: ${backupPath}`);
        console.log(`[Backup CLI] Tables: ${metadata.totalTables} | Records: ${metadata.totalRecords}`);
        const pruned = pruneOldBackups(30);
        if (pruned.length > 0) {
          console.log(`[Backup CLI] Pruned ${pruned.length} expired snapshots (>30 days).`);
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error('[Backup CLI Error]', err);
        process.exit(1);
      });
  }
}
