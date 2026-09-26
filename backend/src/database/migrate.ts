import fs from 'fs';
import path from 'path';
import { db } from './db';

export async function runMigrations() {
  console.log('[Migration] Starting database migration...');
  const candidatePaths = [
    path.resolve(__dirname, './schema.sql'),
    path.resolve(__dirname, '../database/schema.sql'),
    path.resolve(__dirname, '../../../database/schema.sql'),
    path.resolve(process.cwd(), 'database/schema.sql'),
    path.resolve(process.cwd(), '../database/schema.sql'),
    path.resolve(process.cwd(), 'src/database/schema.sql'),
  ];

  const schemaPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!schemaPath) {
    throw new Error(`Schema file not found in any expected location: ${candidatePaths.join(', ')}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await db.exec(sql);
    console.log('[Migration] Database schema applied successfully!');
  } catch (err) {
    console.error('[Migration] Failed to apply schema:', err);
    throw err;
  }
}

// Run directly if invoked from CLI
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Fatal error:', err);
      process.exit(1);
    });
}
