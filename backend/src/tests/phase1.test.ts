import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

async function req(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- STARTING PHASE 1 AUTOMATED TESTS ---');

  // Test 1: Health check
  console.log('1. Health check...');
  const health = await req('/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, 'healthy');
  console.log('   ✓ Health check passed');

  // Test 2: Register a new student
  console.log('2. Registering new student...');
  const testPhone = `+91912345${Math.floor(1000 + Math.random() * 9000)}`;
  const testEmail = `student_${Date.now()}@example.com`;
  const regRes = await req('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Aarav Patel',
      phone: testPhone,
      email: testEmail,
      password: 'Password@123',
      city: 'Mumbai',
      state: 'Maharashtra',
    }),
  });
  assert.strictEqual(regRes.status, 201, `Failed registration: ${JSON.stringify(regRes.data)}`);
  assert.strictEqual(regRes.data.success, true);
  assert.strictEqual(regRes.data.data.status, 'PENDING_APPROVAL');
  const studentId = regRes.data.data.id;
  console.log(`   ✓ Registration passed. Student ID: ${studentId}, Status: PENDING_APPROVAL`);

  // Test 3: Attempt login as pending student (must be rejected with HTTP 403)
  console.log('3. Attempting login as PENDING student...');
  const pendingLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testPhone,
      password: 'Password@123',
    }),
  });
  assert.strictEqual(pendingLogin.status, 403);
  assert.strictEqual(pendingLogin.data.code, 'ACCOUNT_PENDING_APPROVAL');
  assert.strictEqual(
    pendingLogin.data.message,
    'Your registration has been submitted. Please wait for administrator approval.'
  );
  console.log('   ✓ Access forbidden as expected. Message matches specification.');

  // Test 4: Admin login
  console.log('4. Admin login...');
  const adminLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'admin@institute.edu',
      password: 'Admin@123',
    }),
  });
  assert.strictEqual(adminLogin.status, 200, `Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  const adminToken = adminLogin.data.data.accessToken;
  assert.ok(adminToken, 'Admin access token received');
  console.log('   ✓ Admin login successful.');

  // Test 5: Admin retrieves pending students list
  console.log('5. Admin fetches pending students...');
  const pendingList = await req('/api/v1/admin/students/pending', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(pendingList.status, 200);
  const foundInPending = pendingList.data.data.some((s: any) => s.id === studentId);
  assert.ok(foundInPending, 'Newly registered student must be in pending list');
  console.log(`   ✓ Student found in pending list. Total pending: ${pendingList.data.meta.total}`);

  // Test 6: Admin approves student
  console.log('6. Admin approves student account...');
  const approveRes = await req(`/api/v1/admin/students/${studentId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.data.data.status, 'ACTIVE');
  console.log('   ✓ Student status transitioned: PENDING_APPROVAL -> ACTIVE');

  // Test 7: Student login after approval
  console.log('7. Student login after approval...');
  const studentLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testPhone,
      password: 'Password@123',
    }),
  });
  assert.strictEqual(studentLogin.status, 200, `Student login failed: ${JSON.stringify(studentLogin.data)}`);
  const studentToken = studentLogin.data.data.accessToken;
  assert.ok(studentToken, 'Student access token received');
  console.log('   ✓ Student login successful! Access token granted.');

  // Test 8: Student fetches own profile
  console.log('8. Student accessing protected /api/v1/auth/me...');
  const meRes = await req('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.data.data.fullName, 'Aarav Patel');
  assert.strictEqual(meRes.data.data.status, 'ACTIVE');
  console.log('   ✓ Student profile returned successfully.');

  // Test 9: Admin suspends student
  console.log('9. Admin suspends student...');
  const suspendRes = await req(`/api/v1/admin/students/${studentId}/suspend`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ reason: 'Policy violation test' }),
  });
  assert.strictEqual(suspendRes.status, 200);
  assert.strictEqual(suspendRes.data.data.status, 'SUSPENDED');
  console.log('   ✓ Student status transitioned: ACTIVE -> SUSPENDED');

  // Test 10: Verify student previous token is revoked immediately
  console.log('10. Verifying active student token is rejected...');
  const meAfterSuspend = await req('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(meAfterSuspend.status, 401);
  assert.strictEqual(meAfterSuspend.data.code, 'SESSION_EXPIRED');
  console.log('   ✓ Previous JWT token rejected due to token_version invalidation.');

  // Test 11: Attempt login when suspended
  console.log('11. Student login while suspended...');
  const suspendedLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testPhone,
      password: 'Password@123',
    }),
  });
  assert.strictEqual(suspendedLogin.status, 403);
  assert.strictEqual(suspendedLogin.data.code, 'ACCOUNT_SUSPENDED');
  console.log('   ✓ Suspended login blocked with HTTP 403.');

  // Test 12: Admin reactivates student
  console.log('12. Admin reactivates student...');
  const reactivateRes = await req(`/api/v1/admin/students/${studentId}/reactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(reactivateRes.status, 200);
  assert.strictEqual(reactivateRes.data.data.status, 'ACTIVE');
  console.log('   ✓ Student reactivated: SUSPENDED -> ACTIVE');

  // Test 13: Student logs in again
  console.log('13. Student login after reactivation...');
  const reactivatedLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testPhone,
      password: 'Password@123',
    }),
  });
  assert.strictEqual(reactivatedLogin.status, 200);
  console.log('   ✓ Reactivated student successfully authenticated.');

  console.log('\n=========================================');
  console.log('ALL PHASE 1 BACKEND API TESTS PASSED! (13/13)');
  console.log('=========================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
