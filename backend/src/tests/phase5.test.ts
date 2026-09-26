import assert from 'node:assert';
import crypto from 'node:crypto';

const API_BASE = 'http://localhost:5001/api/v1';

async function runPhase5Tests() {
  console.log('--- STARTING PHASE 5 AUTOMATED TESTS (PAYMENTS, RAZORPAY & QR) ---');

  // 1. Admin login to create purchasable courses
  console.log('1. Admin authenticating...');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@institute.edu',
      password: 'Admin@123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert.strictEqual(adminLoginRes.status, 200);
  const adminToken = adminLoginData.data.accessToken;
  console.log('   ✓ Admin authenticated.');

  // Create course for Razorpay purchase
  console.log('2. Admin creating published course for Razorpay test...');
  const course1Res = await fetch(`${API_BASE}/admin/courses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Cloud Native Microservices Architecture',
      shortDescription: 'Master Kubernetes, Go microservices, and gRPC.',
      description: 'Comprehensive industry-grade microservices development with Go, Docker, Kubernetes, and Istio service mesh.',
      instructorName: 'Prof. David Miller',
      price: 7999,
      durationHours: 80,
    }),
  });
  const course1Data = await course1Res.json();
  assert.strictEqual(course1Res.status, 201);
  const razorpayCourseId = course1Data.data.id;

  // Publish the course
  await fetch(`${API_BASE}/admin/courses/${razorpayCourseId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   ✓ Course created and published: ID=${razorpayCourseId}`);

  // Create second course for QR Payment test
  console.log('3. Admin creating published course for QR Payment test...');
  const course2Res = await fetch(`${API_BASE}/admin/courses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'AI & Deep Learning Masterclass',
      shortDescription: 'Master PyTorch, Transformers, and LLM fine-tuning.',
      description: 'Hands-on deep learning curriculum covering computer vision, natural language processing, diffusion models, and LLM fine-tuning.',
      instructorName: 'Dr. Sarah Connor',
      price: 11999,
      durationHours: 100,
    }),
  });
  const course2Data = await course2Res.json();
  assert.strictEqual(course2Res.status, 201);
  const qrCourseId = course2Data.data.id;

  await fetch(`${API_BASE}/admin/courses/${qrCourseId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   ✓ Course created and published: ID=${qrCourseId}`);

  // 4. Authenticate as Priya Patel
  console.log('4. Authenticating as student (Priya Patel)...');
  const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'priya.patel@example.com',
      password: 'Student@123',
    }),
  });
  const studentLoginData = await studentLoginRes.json();
  assert.strictEqual(studentLoginRes.status, 200);
  const studentToken = studentLoginData.data.accessToken;
  const studentId = studentLoginData.data.user.id;
  console.log(`   ✓ Student authenticated: ${studentLoginData.data.user.fullName} (ID: ${studentId})`);

  // 5. Section 9: Browse Course Catalog
  console.log('5. Fetching Section 9 Course Catalog with enrollment status flags...');
  const catalogRes = await fetch(`${API_BASE}/student/catalog`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(catalogRes.status, 200);
  const catalogData = await catalogRes.json();
  assert.strictEqual(catalogData.success, true);
  assert.ok(catalogData.data.length >= 2, 'Catalog should contain published courses');

  const razorpayCourseCatalog = catalogData.data.find((c: any) => c.id === razorpayCourseId);
  assert.ok(razorpayCourseCatalog, 'New course must appear in catalog');
  assert.strictEqual(razorpayCourseCatalog.isEnrolled, false, 'Should not be enrolled yet (shows [ Buy Now ])');
  console.log(`   ✓ Catalog item verified: "${razorpayCourseCatalog.title}" - ₹${razorpayCourseCatalog.price} - isEnrolled: ${razorpayCourseCatalog.isEnrolled}`);

  // 6. Section 10: Automatic Checkout Pre-population
  console.log('6. Verifying Section 10 Pre-populated Checkout confirmation details...');
  const checkoutRes = await fetch(`${API_BASE}/payments/checkout-details/${razorpayCourseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(checkoutRes.status, 200);
  const checkoutData = await checkoutRes.json();
  assert.strictEqual(checkoutData.success, true);
  assert.ok(checkoutData.data.student.name.includes('Priya Patel'), 'Name automatically pre-populated');
  assert.ok(checkoutData.data.student.phone.includes('+919888877777'), 'Phone automatically pre-populated');
  assert.strictEqual(checkoutData.data.student.email, 'priya.patel@example.com');
  assert.strictEqual(checkoutData.data.course.price, 7999);
  assert.strictEqual(checkoutData.data.alreadyEnrolled, false);
  console.log('   ✓ Student identity automatically retrieved from database (No manual re-entry required).');

  // 7. Section 10: Create Razorpay Order
  console.log('7. Creating Razorpay Order...');
  const orderRes = await fetch(`${API_BASE}/payments/razorpay/create-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId: razorpayCourseId }),
  });
  assert.strictEqual(orderRes.status, 201);
  const orderData = await orderRes.json();
  assert.ok(orderData.data.orderId.startsWith('order_'), 'Must generate authentic orderId');
  assert.strictEqual(orderData.data.amountPaise, 799900);
  assert.strictEqual(orderData.data.currency, 'INR');
  const razorpayOrderId = orderData.data.orderId;
  console.log(`   ✓ Razorpay order created: ${razorpayOrderId} (₹7999.00 / 799900 paise)`);

  // 8. Section 10: Security Test — Tampered/Fraudulent Signature Rejection
  console.log('8. Security Test: Verifying backend rejects fraudulent/tampered signatures...');
  const fakeVerifyRes = await fetch(`${API_BASE}/payments/razorpay/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: razorpayOrderId,
      razorpayPaymentId: 'pay_fraudulent_123',
      razorpaySignature: 'fraudulent_signature_hex_value',
    }),
  });
  assert.strictEqual(fakeVerifyRes.status, 400);
  const fakeVerifyData = await fakeVerifyRes.json();
  assert.strictEqual(fakeVerifyData.code, 'INVALID_SIGNATURE');
  console.log('   ✓ Server-side cryptographic check caught fraudulent signature.');

  // 9. Section 10 & 34: Valid Signature Verification & Atomic Course Enrollment
  console.log('9. Verifying authentic Razorpay payment signature & auto-enrollment...');
  const paymentId = `pay_${Date.now().toString(36)}`;
  // Compute valid cryptographic signature using config key secret
  const validSignature = crypto
    .createHmac('sha256', 'rzp_test_secret_mock_secret_2026')
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest('hex');

  const validVerifyRes = await fetch(`${API_BASE}/payments/razorpay/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
    }),
  });
  assert.strictEqual(validVerifyRes.status, 200);
  const validVerifyData = await validVerifyRes.json();
  assert.strictEqual(validVerifyData.success, true);
  assert.strictEqual(validVerifyData.data.status, 'SUCCESS');
  console.log('   ✓ Payment cryptographically verified. Status: SUCCESS.');

  // 10. Verify course now appears in student's My Courses and Catalog as [ Purchased ]
  console.log('10. Verifying course appears in My Courses and isEnrolled=true in Catalog...');
  const myCoursesRes = await fetch(`${API_BASE}/student/courses`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const myCoursesData = await myCoursesRes.json();
  const purchasedCourse = myCoursesData.data.find((c: any) => c.id === razorpayCourseId);
  assert.ok(purchasedCourse, 'Newly purchased course must appear in My Courses');

  const updatedCatalogRes = await fetch(`${API_BASE}/student/catalog`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const updatedCatalog = await updatedCatalogRes.json();
  const catalogCheck = updatedCatalog.data.find((c: any) => c.id === razorpayCourseId);
  assert.strictEqual(catalogCheck.isEnrolled, true, 'Status toggled to [ Purchased ]');
  console.log('   ✓ Course actively enrolled and marked as [ Purchased ].');

  // 11. Section 10: Duplicate purchase protection
  console.log('11. Testing duplicate purchase protection on owned course...');
  const dupOrderRes = await fetch(`${API_BASE}/payments/razorpay/create-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId: razorpayCourseId }),
  });
  assert.strictEqual(dupOrderRes.status, 400);
  const dupData = await dupOrderRes.json();
  assert.strictEqual(dupData.code, 'ALREADY_ENROLLED');
  console.log('   ✓ Duplicate purchase attempt blocked with ALREADY_ENROLLED.');

  // 12. Section 11: Secure Institutional QR Payment Submission
  console.log('12. Submitting Institutional QR Code Payment Claim (Section 11)...');
  const utrNumber = `UTR_HDFC_${Date.now()}`;
  const qrSubmitRes = await fetch(`${API_BASE}/payments/qr/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      courseId: qrCourseId,
      utrTransactionId: utrNumber,
    }),
  });
  assert.strictEqual(qrSubmitRes.status, 201);
  const qrSubmitData = await qrSubmitRes.json();
  assert.strictEqual(qrSubmitData.data.status, 'PENDING');
  assert.strictEqual(qrSubmitData.data.paymentMethod, 'QR_CODE');
  const qrPaymentId = qrSubmitData.data.paymentId;
  console.log(`   ✓ QR payment claim submitted with reference: ${utrNumber}. Status: PENDING.`);

  // Verify student is NOT enrolled immediately (Section 11: require administrator verification)
  const qrEnrollCheck = await fetch(`${API_BASE}/payments/checkout-details/${qrCourseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const qrEnrollData = await qrEnrollCheck.json();
  assert.strictEqual(qrEnrollData.data.alreadyEnrolled, false, 'QR payment MUST NOT grant access before admin verification');
  console.log('   ✓ Confirmed: Access is not granted automatically upon QR submission.');

  // 13. Section 11 & 35: Admin Audits & Manually Verifies QR Payment
  console.log('13. Admin viewing payments audit log and reconciling QR transaction (Section 35)...');
  const adminPaymentsRes = await fetch(`${API_BASE}/admin/payments?status=PENDING&paymentMethod=QR_CODE`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminPaymentsRes.status, 200);
  const adminPaymentsData = await adminPaymentsRes.json();
  const pendingQr = adminPaymentsData.data.find((p: any) => p.id === qrPaymentId);
  assert.ok(pendingQr, 'Pending QR payment must appear in Admin payment audit dashboard');
  assert.strictEqual(pendingQr.qrReferenceCode, utrNumber);
  console.log(`   ✓ Admin located pending transaction: Student: ${pendingQr.student.name}, Amount: ₹${pendingQr.amount}, UTR: ${pendingQr.qrReferenceCode}`);

  // Admin approves/verifies the QR payment
  console.log('14. Admin manually verifying QR transaction...');
  const verifyQrRes = await fetch(`${API_BASE}/admin/payments/${qrPaymentId}/verify-qr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(verifyQrRes.status, 200);
  const verifyQrData = await verifyQrRes.json();
  assert.strictEqual(verifyQrData.data.status, 'MANUALLY_VERIFIED');
  console.log('   ✓ Payment status transitioned: PENDING -> MANUALLY_VERIFIED.');

  // Verify student now has access to the QR-purchased course
  const verifiedCheck = await fetch(`${API_BASE}/payments/checkout-details/${qrCourseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const verifiedData = await verifiedCheck.json();
  assert.strictEqual(verifiedData.data.alreadyEnrolled, true, 'Student now has active access after admin verification');
  console.log('   ✓ Student access activated following administrator verification.');

  console.log('\n=========================================');
  console.log('ALL PHASE 5 BACKEND API TESTS PASSED! (14/14)');
  console.log('=========================================\n');
}

runPhase5Tests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
