import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
  pruneOldBackups,
  BACKUP_TABLES,
} from '../scripts/backup';

const API_BASE = 'http://localhost:5001';

async function request(url: string, options: any = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

async function runPhase10Tests() {
  console.log('\n--- STARTING PHASE 10 AUTOMATED TESTS (DEPLOYMENT, BACKUPS & READINESS) ---');

  // 1. Section 42: Liveness Health Probe (/health)
  console.log('1. Testing Section 42 Liveness Probe (GET /health)...');
  const healthRes = await request(`${API_BASE}/health`);
  assert.ok(healthRes.data.status === 'healthy' || healthRes.data.status === 'UP', 'Status should be healthy or UP');
  assert.ok(typeof healthRes.data.uptime === 'number' && healthRes.data.uptime >= 0, 'Uptime must be a valid number');
  assert.ok(healthRes.data.timestamp, 'Timestamp must be present');
  console.log(`   ✓ Liveness probe verified: status=${healthRes.data.status}, uptime=${healthRes.data.uptime}s`);

  // 2. Section 42: Readiness Infrastructure Probe (/ready)
  console.log('2. Testing Section 42 Readiness Probe (GET /ready)...');
  const readyRes = await request(`${API_BASE}/ready`);
  assert.strictEqual(readyRes.status, 200, 'Readiness probe must return 200 OK');
  assert.strictEqual(readyRes.data.status, 'READY');
  assert.strictEqual(readyRes.data.checks?.database?.status, 'CONNECTED');
  assert.ok(typeof readyRes.data.checks?.database?.latencyMs === 'number', 'Latency must be numeric');
  assert.ok(readyRes.data.checks?.memory?.heapUsedMB > 0, 'Heap memory must be reported');
  console.log(`   ✓ Readiness probe verified: DB=CONNECTED (${readyRes.data.checks.database.latencyMs}ms), Heap=${readyRes.data.checks.memory.heapUsedMB}MB`);

  // 3. Section 44: Automated Database Backup Generation
  console.log('3. Testing Section 44 Automated Database Snapshot Generation...');
  const testBackupDir = path.resolve(__dirname, '../../../database/test_backups');
  if (fs.existsSync(testBackupDir)) {
    fs.rmSync(testBackupDir, { recursive: true, force: true });
  }

  const backupResult = await createDatabaseBackup(testBackupDir);
  assert.ok(fs.existsSync(backupResult.backupPath), 'Backup file must be written to disk');
  assert.ok(backupResult.metadata.totalTables >= 15, `Expected >= 15 tables, got ${backupResult.metadata.totalTables}`);
  assert.ok(backupResult.metadata.totalRecords > 0, `Expected > 0 records, got ${backupResult.metadata.totalRecords}`);
  console.log(`   ✓ Snapshot generated: ${path.basename(backupResult.backupPath)} (${backupResult.metadata.totalRecords} records across ${backupResult.metadata.totalTables} tables).`);

  // 4. Section 44: Snapshot Content & Schema Integrity
  console.log('4. Verifying Snapshot File JSON Structure and Core Tables Content...');
  const snapshotRaw = fs.readFileSync(backupResult.backupPath, 'utf-8');
  const snapshotData = JSON.parse(snapshotRaw);
  assert.strictEqual(snapshotData.metadata.version, '1.0.0');
  assert.ok(snapshotData.data.users.length > 0, 'Users table must have records in snapshot');
  assert.ok(snapshotData.data.courses.length > 0, 'Courses table must have records in snapshot');
  console.log(`   ✓ Snapshot schema validated: users=${snapshotData.data.users.length}, courses=${snapshotData.data.courses.length}`);

  // 5. Section 44: Backup Retention Policy Pruning
  console.log('5. Testing Backup Retention Policy Pruning (removing expired snapshots)...');
  // Create a mock expired backup file with mtime 45 days in the past
  const expiredFileName = 'db_backup_2026-01-01T00-00-00-000Z.json';
  const expiredFilePath = path.join(testBackupDir, expiredFileName);
  fs.writeFileSync(expiredFilePath, JSON.stringify({ mock: true }));
  const pastTime = (Date.now() - (45 * 24 * 60 * 60 * 1000)) / 1000;
  fs.utimesSync(expiredFilePath, pastTime, pastTime);

  const pruned = pruneOldBackups(30, testBackupDir);
  assert.ok(pruned.includes(expiredFileName), 'Expired backup must be pruned');
  assert.ok(!fs.existsSync(expiredFilePath), 'Expired file must be removed from disk');
  assert.ok(fs.existsSync(backupResult.backupPath), 'Recent backup must be retained');
  console.log(`   ✓ Retention pruning verified: purged 45-day expired snapshot; preserved recent backup.`);

  // 6. Section 44: Database State Restoration
  console.log('6. Testing Database State Restoration from Snapshot...');
  const restoreMeta = await restoreDatabaseBackup(backupResult.backupPath);
  assert.strictEqual(restoreMeta.totalRecords, backupResult.metadata.totalRecords);
  console.log(`   ✓ Database restored successfully: ${restoreMeta.totalRecords} records synced.`);

  // Clean up test backups directory
  fs.rmSync(testBackupDir, { recursive: true, force: true });

  // 7. Section 45: Backend Multi-Stage Dockerfile Verification
  console.log('7. Verifying Backend Multi-stage Dockerfile Security & Configuration...');
  const backendDockerfilePath = path.resolve(__dirname, '../../Dockerfile');
  assert.ok(fs.existsSync(backendDockerfilePath), 'backend/Dockerfile must exist');
  const backendDockerContent = fs.readFileSync(backendDockerfilePath, 'utf-8');
  assert.ok(backendDockerContent.includes('FROM node:20-alpine AS builder'), 'Must have builder stage');
  assert.ok(backendDockerContent.includes('FROM node:20-alpine AS production'), 'Must have production stage');
  assert.ok(backendDockerContent.includes('USER node'), 'Must specify non-root user for security');
  assert.ok(backendDockerContent.includes('HEALTHCHECK'), 'Must include container healthcheck');
  assert.ok(backendDockerContent.includes('EXPOSE 5001'), 'Must expose port 5001');
  console.log('   ✓ Backend Dockerfile verified: multi-stage, non-root user, healthcheck configured.');

  // 8. Section 45: Frontend Multi-Stage Dockerfile Verification
  console.log('8. Verifying Frontend Multi-stage Dockerfile with NGINX...');
  const frontendDockerfilePath = path.resolve(__dirname, '../../../frontend/Dockerfile');
  assert.ok(fs.existsSync(frontendDockerfilePath), 'frontend/Dockerfile must exist');
  const frontendDockerContent = fs.readFileSync(frontendDockerfilePath, 'utf-8');
  assert.ok(frontendDockerContent.includes('AS builder'), 'Must have builder stage');
  assert.ok(frontendDockerContent.includes('FROM nginx:alpine'), 'Must use nginx:alpine runtime');
  assert.ok(frontendDockerContent.includes('EXPOSE 80'), 'Must expose port 80');
  console.log('   ✓ Frontend Dockerfile verified: multi-stage build with NGINX web server.');

  // 9. Section 45: Production NGINX Reverse Proxy Configuration
  console.log('9. Verifying NGINX Reverse Proxy, Compression, and Security Headers...');
  const nginxConfPath = path.resolve(__dirname, '../../../nginx/nginx.conf');
  assert.ok(fs.existsSync(nginxConfPath), 'nginx/nginx.conf must exist');
  const nginxConf = fs.readFileSync(nginxConfPath, 'utf-8');
  assert.ok(nginxConf.includes('gzip on;'), 'Gzip compression must be enabled');
  assert.ok(nginxConf.includes('proxy_pass http://backend:5001/api/;'), 'API proxy pass configured');
  assert.ok(nginxConf.includes('try_files $uri $uri/ /index.html;'), 'SPA client routing fallback configured');
  assert.ok(nginxConf.includes('X-Frame-Options "DENY"'), 'X-Frame-Options header present');
  assert.ok(nginxConf.includes('X-Content-Type-Options "nosniff"'), 'nosniff header present');
  assert.ok(nginxConf.includes('max-age=31536000'), 'Long-term static asset caching configured');
  console.log('   ✓ NGINX configuration verified: gzip, reverse proxy, SPA fallback, security headers.');

  // 10. Section 45: Production Docker Compose Multi-Container Orchestration
  console.log('10. Verifying Docker Compose Multi-Container Stack Specification...');
  const composePath = path.resolve(__dirname, '../../../docker-compose.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');
  const composeContent = fs.readFileSync(composePath, 'utf-8');
  assert.ok(composeContent.includes('institute_lms_db'), 'Database container defined');
  assert.ok(composeContent.includes('institute_lms_backend'), 'Backend container defined');
  assert.ok(composeContent.includes('institute_lms_frontend'), 'Frontend container defined');
  assert.ok(composeContent.includes('postgres_data:'), 'Persistent volume for postgres defined');
  assert.ok(composeContent.includes('condition: service_healthy'), 'Container dependency healthcheck order defined');
  console.log('   ✓ Docker Compose verified: postgres, backend, frontend services with volume persistence.');

  // 11. Section 40 & 47: Production Environment Configuration Template
  console.log('11. Verifying Production Environment Configuration Template (.env.production.example)...');
  const envExamplePath = path.resolve(__dirname, '../../../.env.production.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.production.example must exist');
  const envContent = fs.readFileSync(envExamplePath, 'utf-8');
  assert.ok(envContent.includes('JWT_SECRET'), 'JWT_SECRET documented');
  assert.ok(envContent.includes('DATABASE_URL'), 'DATABASE_URL documented');
  assert.ok(envContent.includes('RAZORPAY_KEY_ID'), 'RAZORPAY_KEY_ID documented');
  assert.ok(envContent.includes('STORAGE_BUCKET'), 'STORAGE_BUCKET documented');
  assert.ok(envContent.includes('CORS_ORIGIN'), 'CORS_ORIGIN documented');
  console.log('   ✓ Production environment variable template verified with all required secrets.');

  // 12. Frontend Production Static Build Verification
  console.log('12. Verifying Frontend Production Static Build Bundle...');
  const distHtmlPath = path.resolve(__dirname, '../../../frontend/dist/index.html');
  assert.ok(fs.existsSync(distHtmlPath), 'frontend/dist/index.html must exist');
  const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');
  assert.ok(htmlContent.includes('<div id="root"></div>'), 'HTML root mount point present');

  const assetsDir = path.resolve(__dirname, '../../../frontend/dist/assets');
  assert.ok(fs.existsSync(assetsDir), 'frontend/dist/assets must exist');
  const assetFiles = fs.readdirSync(assetsDir);
  assert.ok(assetFiles.some((f) => f.endsWith('.js')), 'Compiled JS bundle exists');
  assert.ok(assetFiles.some((f) => f.endsWith('.css')), 'Compiled CSS bundle exists');
  console.log(`   ✓ Production static build bundle verified: HTML, JS, CSS (${assetFiles.length} asset files).`);

  console.log('\n========================================================');
  console.log('🎉 ALL 12 PHASE 10 DEPLOYMENT & BACKUP TESTS PASSED!');
  console.log('========================================================\n');
}

runPhase10Tests().catch((err) => {
  console.error('Phase 10 test failed:', err);
  process.exit(1);
});
