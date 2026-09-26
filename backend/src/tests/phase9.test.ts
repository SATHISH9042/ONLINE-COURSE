import assert from 'assert';
import http from 'http';
import { isSafePath, resolveSafePath } from '../utils/pathSafety';
import { sanitizeObject } from '../middleware/sanitize.middleware';
import { executeJavaScript } from '../utils/codeSandbox';

const API_BASE = 'http://localhost:5001/api/v1';

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

async function runPhase9Tests() {
  console.log('\n--- STARTING PHASE 9 AUTOMATED TESTS (SECURITY HARDENING & PENETRATION) ---');

  // 1. Verify Security Headers (Helmet, CSP, Frameguard)
  console.log('1. Testing Security HTTP Headers (Helmet, CSP, X-Frame-Options, X-Content-Type-Options)...');
  const healthRes = await fetch('http://localhost:5001/health');
  assert.strictEqual(healthRes.headers.get('x-content-type-options'), 'nosniff', 'Missing nosniff header');
  assert.ok(healthRes.headers.get('content-security-policy'), 'Missing Content-Security-Policy header');
  assert.ok(
    healthRes.headers.get('x-frame-options') || healthRes.headers.get('content-security-policy')?.includes('frame-ancestors'),
    'Missing frame protection / clickjacking guard'
  );
  console.log('   ✓ Security headers verified: CSP, X-Content-Type-Options, Frameguard active.');

  // 2. Authentication Enforcement: Protected Endpoints Without Token
  console.log('2. Testing Authentication Enforcement (missing Authorization header)...');
  const noAuthAdmin = await request(`${API_BASE}/admin/analytics/overview`);
  assert.strictEqual(noAuthAdmin.status, 401, 'Should block unauthenticated admin access with 401');
  assert.strictEqual(noAuthAdmin.data.code, 'UNAUTHORIZED');

  const noAuthStudent = await request(`${API_BASE}/student/dashboard`);
  assert.strictEqual(noAuthStudent.status, 401, 'Should block unauthenticated student access with 401');
  console.log('   ✓ Protected routes strictly require Bearer token authorization.');

  // 3. Token Tampering Detection
  console.log('3. Testing Cryptographic Token Tampering & Forgery Detection...');
  const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.FORGED_INVALID_SIGNATURE_XYZ';
  const forgedRes = await request(`${API_BASE}/admin/analytics/overview`, {
    headers: { Authorization: `Bearer ${forgedToken}` },
  });
  assert.strictEqual(forgedRes.status, 401, 'Should reject forged token with 401');
  assert.strictEqual(forgedRes.data.code, 'INVALID_TOKEN');
  console.log('   ✓ Cryptographic signature tampering blocked with HTTP 401 INVALID_TOKEN.');

  // 4. Role-Based Privilege Boundary: Student Attempting Admin Endpoints
  console.log('4. Testing Role-Based Authorization (Student attempting administrative operations)...');
  const adminLogin = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin@institute.edu', password: 'Admin@123' }),
  });
  const adminToken = adminLogin.data.data?.accessToken;
  assert.ok(adminToken, 'Admin token required');

  const studentLogin = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ identifier: 'priya.patel@example.com', password: 'Student@123' }),
  });
  const studentToken = studentLogin.data.data?.accessToken;
  assert.ok(studentToken, 'Should retrieve student token');

  const studentAdminAttempt = await request(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentAdminAttempt.status, 403, 'Student must be rejected from admin routes with 403');
  assert.strictEqual(studentAdminAttempt.data.code, 'FORBIDDEN');

  const studentCreateCourse = await request(`${API_BASE}/admin/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ title: 'Hacked Course', price: 0 }),
  });
  assert.strictEqual(studentCreateCourse.status, 403, 'Student cannot create courses');
  console.log('   ✓ Role boundary verified: Student forbidden (403) from accessing admin endpoints.');

  // 5. SQL Injection Immunity Test (Fuzzing parameters & query strings)
  console.log('5. Testing SQL Injection Immunity on search, filters, and auth queries...');
  const sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT null, null, 'hacked' --",
    "1' OR '1'='1' --",
    "admin' --",
  ];

  for (const payload of sqliPayloads) {
    // Test auth login with SQLi payload
    const sqliLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ identifier: payload, password: 'password' }),
    });
    assert.ok(sqliLogin.status === 400 || sqliLogin.status === 401, `SQLi login payload [${payload}] was not safely rejected`);

    // Test catalog search with SQLi payload
    const sqliCatalog = await request(`${API_BASE}/student/catalog?search=${encodeURIComponent(payload)}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(sqliCatalog.status, 200, 'Search should safely treat SQLi as literal search string');
    assert.strictEqual(sqliCatalog.data.success, true);
  }
  console.log('   ✓ SQL Injection immunity confirmed across auth and catalog endpoints.');

  // 6. Cross-Site Scripting (XSS) Sanitization Test
  console.log('6. Testing XSS payload scrubbing on student profile inputs...');
  const xssPayload = "<script>alert('XSS_PWNED')</script>Priya Patel<img src=x onerror=alert(1)>";
  const updateRes = await request(`${API_BASE}/student/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      fullName: xssPayload,
      bio: 'Full Stack Engineer <script>evil()</script>',
    }),
  });
  assert.strictEqual(updateRes.status, 200, 'Profile update succeeded');

  const profileRes = await request(`${API_BASE}/student/profile`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(profileRes.status, 200);
  const fetchedName = profileRes.data.data?.full_name;
  const fetchedBio = profileRes.data.data?.bio;
  assert.ok(fetchedName, 'full_name should exist');
  assert.ok(!fetchedName.includes('<script>'), 'Script tag must be stripped from student fullName');
  assert.ok(!fetchedName.includes('onerror='), 'onerror event handler must be neutralized');
  assert.ok(!fetchedBio.includes('<script>'), 'Script tag must be stripped from student bio');
  console.log(`   ✓ XSS sanitized cleanly: "${fetchedName}" (script tags and event handlers neutralized).`);

  // 7. Preservation of Legitimate Programming Source Code
  console.log('7. Testing preservation of code syntax in student coding submissions...');
  const studentCode = 'function solution(a, b) {\n  return a < b ? a : b;\n}';
  const sanitizedCodeObj = sanitizeObject({ code: studentCode, submittedCode: studentCode });
  assert.strictEqual(sanitizedCodeObj.code, studentCode, 'Code must not be modified by sanitizer');
  assert.strictEqual(sanitizedCodeObj.submittedCode, studentCode, 'SubmittedCode must not be modified by sanitizer');

  const execResult = await executeJavaScript(studentCode + '\nconsole.log(solution(3, 7));', '');
  assert.strictEqual(execResult.stdout.trim(), '3', 'Code executed correctly inside sandbox');
  console.log('   ✓ Legitimate programming code symbols (<, >, ternary, operators) preserved and executed.');

  // 8. Fraudulent Razorpay HMAC Signature Detection
  console.log('8. Testing cryptographic verification on fraudulent payment signatures...');
  const newCourseRes = await request(`${API_BASE}/admin/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Security Verification Course ' + Date.now(),
      shortDescription: 'Testing payment security',
      description: 'Course created to verify HMAC signature tampering detection',
      instructorName: 'Security Team',
      price: 1599,
      durationHours: 15,
    }),
  });
  const courseId = newCourseRes.data.data.id;
  await request(`${API_BASE}/admin/courses/${courseId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const orderRes = await request(`${API_BASE}/payments/razorpay/create-order`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ courseId }),
  });
  assert.strictEqual(orderRes.status, 201, 'Order created successfully');
  const testOrderId = orderRes.data.data.orderId;

  const fraudPayment = await request(`${API_BASE}/payments/razorpay/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpayPaymentId: 'pay_test_tampered_123',
      razorpaySignature: 'bad_forged_hmac_sha256_hash_value',
    }),
  });
  assert.strictEqual(fraudPayment.status, 400, 'Tampered payment signature must be rejected with 400');
  assert.strictEqual(fraudPayment.data.code, 'INVALID_SIGNATURE');
  console.log('   ✓ Tampered Razorpay HMAC signature caught and rejected with HTTP 400 INVALID_SIGNATURE.');

  // 9. Path Traversal & Safe Path Resolution
  console.log('9. Testing Path Traversal guards against arbitrary file inclusion/escape...');
  assert.strictEqual(isSafePath('../../etc/passwd'), false, 'Should block ../ traversal');
  assert.strictEqual(isSafePath('..\\..\\windows\\system32'), false, 'Should block ..\\ traversal');
  assert.strictEqual(isSafePath('uploads/user\0.jpg'), false, 'Should block null-byte injection');
  assert.strictEqual(isSafePath('%2e%2e%2fetc%2fpasswd'), false, 'Should block URL-encoded traversal');
  assert.strictEqual(isSafePath('uploads/courses/video_101.mp4'), true, 'Should allow safe canonical relative path');

  let traversalBlocked = false;
  try {
    resolveSafePath('/var/www/uploads', '../../etc/passwd');
  } catch (err: any) {
    traversalBlocked = err.message === 'PATH_TRAVERSAL_DETECTED';
  }
  assert.ok(traversalBlocked, 'resolveSafePath must throw on directory escape');
  console.log('   ✓ Path traversal sequences and null bytes reliably detected and blocked.');

  // 10. Code Execution Sandbox Protection (Timeout containment on infinite loops)
  console.log('10. Testing Sandbox Runaway Execution Termination (infinite loop guard)...');
  const timeoutResult = await executeJavaScript('while (true) {}', '', 500);
  assert.strictEqual(timeoutResult.timedOut, true, 'Infinite loop must be killed on timeout');
  console.log('   ✓ Runaway execution halted: sandbox terminated process within timeout.');

  // 11. Strict Input Validation (Malformed registration payloads)
  console.log('11. Testing Strict Input Validation via Zod (phone format & required fields)...');
  const invalidReg = await request(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'A', // Too short
      phone: '12345', // Invalid phone
      password: '123', // Too short password
    }),
  });
  assert.strictEqual(invalidReg.status, 400, 'Invalid registration payload must be rejected with 400');
  assert.strictEqual(invalidReg.data.code, 'VALIDATION_ERROR');
  console.log('   ✓ Malformed inputs strictly rejected with HTTP 400 VALIDATION_ERROR.');

  // 12. Account Lifecycle Enforcement (Suspended Account Lockout)
  console.log('12. Testing Account Status Lockdown (Suspended account access lockout)...');
  // Register a temporary user to suspend
  const tempPhone = `+9191000${Math.floor(10000 + Math.random() * 90000)}`;
  const tempReg = await request(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Temp Test Student',
      phone: tempPhone,
      password: 'Student@123',
    }),
  });
  const tempUserId = tempReg.data.data?.id;
  assert.ok(tempUserId, 'Temp student registered');

  // Admin approves temp student
  const approveRes = await request(`${API_BASE}/admin/students/${tempUserId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(approveRes.status, 200, 'Student approved successfully');

  // Admin suspends temp student
  const suspendRes = await request(`${API_BASE}/admin/students/${tempUserId}/suspend`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(suspendRes.status, 200, 'Student suspended successfully');

  // Attempt login with suspended student
  const suspendedLogin = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ identifier: tempPhone, password: 'Student@123' }),
  });
  assert.strictEqual(suspendedLogin.status, 403, 'Suspended user login must be forbidden');
  assert.strictEqual(suspendedLogin.data.code, 'ACCOUNT_SUSPENDED');
  console.log('   ✓ Suspended accounts securely locked out with HTTP 403 ACCOUNT_SUSPENDED.');

  console.log('\n========================================================');
  console.log('🎉 ALL 12 PHASE 9 SECURITY & PENETRATION TESTS PASSED!');
  console.log('========================================================\n');
}

runPhase9Tests().catch((err) => {
  console.error('Phase 9 test failed:', err);
  process.exit(1);
});
