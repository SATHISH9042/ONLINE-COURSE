import assert from 'node:assert';

const API_BASE = 'http://localhost:5001/api/v1';

async function runPhase7Tests() {
  console.log('--- STARTING PHASE 7 AUTOMATED TESTS (NOTIFICATIONS CENTER & BROADCAST) ---');

  // 1. Admin login
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

  // 2. Student login (Priya Patel)
  console.log('2. Student authenticating...');
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
  console.log(`   ✓ Student authenticated: ID=${studentId}`);

  // 3. Validation test: COURSE target without course ID
  console.log('3. Testing validation: COURSE audience without courseId...');
  const invalidCourseNotifRes = await fetch(`${API_BASE}/admin/notifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Course Update Alert',
      message: 'New lab modules released.',
      type: 'COURSE_UPDATE',
      targetAudience: 'COURSE',
      // targetCourseId intentionally omitted
    }),
  });
  assert.strictEqual(invalidCourseNotifRes.status, 400);
  const invalidCourseData = await invalidCourseNotifRes.json();
  assert.strictEqual(invalidCourseData.code, 'MISSING_COURSE_ID');
  console.log('   ✓ Correctly rejected missing course ID with 400.');

  // 4. Validation test: STUDENT target without student ID
  console.log('4. Testing validation: STUDENT audience without studentId...');
  const invalidStudentNotifRes = await fetch(`${API_BASE}/admin/notifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Individual Academic Notice',
      message: 'Your lab submission has been reviewed.',
      type: 'SYSTEM',
      targetAudience: 'STUDENT',
      // targetStudentId intentionally omitted
    }),
  });
  assert.strictEqual(invalidStudentNotifRes.status, 400);
  const invalidStudentData = await invalidStudentNotifRes.json();
  assert.strictEqual(invalidStudentData.code, 'MISSING_STUDENT_ID');
  console.log('   ✓ Correctly rejected missing student ID with 400.');

  // 5. Admin sends institutional broadcast to ALL students
  console.log('5. Admin broadcasting institutional announcement to ALL students...');
  const broadcastRes = await fetch(`${API_BASE}/admin/notifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Annual Institute Tech Symposium 2026',
      message: 'Join keynote speakers from DeepMind, Google, and MIT this Friday at 10 AM IST.',
      type: 'ANNOUNCEMENT',
      targetAudience: 'ALL',
    }),
  });
  assert.strictEqual(broadcastRes.status, 201);
  const broadcastData = await broadcastRes.json();
  assert.strictEqual(broadcastData.success, true);
  assert.ok(broadcastData.data.recipientsCount > 0, 'Must distribute to active students');
  const broadcastId = broadcastData.data.id;
  console.log(`   ✓ Broadcast sent to ${broadcastData.data.recipientsCount} students: ID=${broadcastId}`);

  // 6. Student queries notifications - verifies receipt
  console.log('6. Student querying notification center...');
  const studentNotifsRes = await fetch(`${API_BASE}/student/notifications`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentNotifsRes.status, 200);
  const studentNotifsData = await studentNotifsRes.json();
  assert.strictEqual(studentNotifsData.success, true);
  const foundNotif = studentNotifsData.data.notifications.find((n: any) => n.id === broadcastId);
  assert.ok(foundNotif, 'Broadcasted announcement must be received by active student');
  assert.strictEqual(foundNotif.title, 'Annual Institute Tech Symposium 2026');
  assert.strictEqual(foundNotif.isRead, false);
  console.log('   ✓ Notification received by student with isRead=false.');

  // 7. Student checks unread count endpoint
  console.log('7. Student checking unread count counter...');
  const unreadCountRes = await fetch(`${API_BASE}/student/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(unreadCountRes.status, 200);
  const unreadCountData = await unreadCountRes.json();
  assert.strictEqual(unreadCountData.success, true);
  assert.ok(unreadCountData.data.unreadCount >= 1);
  console.log(`   ✓ Unread count verified: ${unreadCountData.data.unreadCount}`);

  // 8. Student marks single notification as read
  console.log('8. Student marking individual notification as read...');
  const markReadRes = await fetch(`${API_BASE}/student/notifications/${broadcastId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(markReadRes.status, 200);
  const markReadData = await markReadRes.json();
  assert.strictEqual(markReadData.success, true);

  // Verify status is now read
  const verifyReadRes = await fetch(`${API_BASE}/student/notifications`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const verifyReadData = await verifyReadRes.json();
  const readItem = verifyReadData.data.notifications.find((n: any) => n.id === broadcastId);
  assert.strictEqual(readItem.isRead, true);
  assert.ok(readItem.readAt, 'readAt timestamp must be recorded');
  console.log('   ✓ Notification marked as read with readAt timestamp.');

  // 9. Admin sends targeted notification to specific student
  console.log('9. Admin sending direct personalized notice to student...');
  const directNotifRes = await fetch(`${API_BASE}/admin/notifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Scholarship Application Approved',
      message: 'Congratulations! Your merit-cum-means scholarship grant has been approved.',
      type: 'SYSTEM',
      targetAudience: 'STUDENT',
      targetStudentId: studentId,
    }),
  });
  assert.strictEqual(directNotifRes.status, 201);
  const directNotifData = await directNotifRes.json();
  assert.strictEqual(directNotifData.data.recipientsCount, 1);
  const directNotifId = directNotifData.data.id;
  console.log(`   ✓ Direct notification delivered: ID=${directNotifId}`);

  // 10. Student marks all notifications as read
  console.log('10. Student marking all notifications as read...');
  const markAllRes = await fetch(`${API_BASE}/student/notifications/mark-all-read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(markAllRes.status, 200);

  const checkZeroRes = await fetch(`${API_BASE}/student/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkZeroData = await checkZeroRes.json();
  assert.strictEqual(checkZeroData.data.unreadCount, 0);
  console.log('   ✓ All notifications marked read. Unread count reset to 0.');

  // 11. Admin views notifications dashboard - verifies read count tracking
  console.log('11. Admin querying notifications overview with read tracking metrics...');
  const adminListRes = await fetch(`${API_BASE}/admin/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminListRes.status, 200);
  const adminListData = await adminListRes.json();
  const foundAdminNotif = adminListData.data.find((n: any) => n.id === broadcastId);
  assert.ok(foundAdminNotif, 'Broadcast notification must appear in admin list');
  assert.ok(foundAdminNotif.readCount >= 1, 'Read count should reflect student reads');
  console.log(`   ✓ Admin dashboard reports: Recipients=${foundAdminNotif.recipientsCount}, ReadCount=${foundAdminNotif.readCount}`);

  // 12. Admin deletes notification
  console.log('12. Admin deleting notification...');
  const delNotifRes = await fetch(`${API_BASE}/admin/notifications/${broadcastId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(delNotifRes.status, 200);

  // Student should no longer see the deleted notification
  const studentAfterDelRes = await fetch(`${API_BASE}/student/notifications`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentAfterDelData = await studentAfterDelRes.json();
  const deletedStillExists = studentAfterDelData.data.notifications.some((n: any) => n.id === broadcastId);
  assert.strictEqual(deletedStillExists, false, 'Deleted notification must be removed from recipient inbox');
  console.log('   ✓ Notification and recipient mappings deleted successfully.');

  console.log('\n========================================================');
  console.log('🎉 ALL 12 PHASE 7 NOTIFICATION & BROADCAST TESTS PASSED!');
  console.log('========================================================\n');
}

runPhase7Tests().catch((err) => {
  console.error('❌ Phase 7 tests failed:', err);
  process.exit(1);
});
