import fs from 'fs';
import path from 'path';
import { db } from './db';

export async function runMigrations() {
  console.log('[Migration] Starting database migration...');
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
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
