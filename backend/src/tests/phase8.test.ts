import assert from 'node:assert';

const API_BASE = 'http://localhost:5001/api/v1';

async function runPhase8Tests() {
  console.log('--- STARTING PHASE 8 AUTOMATED TESTS (ANALYTICS, MONITORING & AUDIT) ---');

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

  // 3. Security test: Student blocked from Admin Analytics API
  console.log('3. Security test: Student attempting to query admin analytics overview...');
  const studentForbiddenRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentForbiddenRes.status, 403);
  console.log('   ✓ Student blocked from analytics overview with HTTP 403.');

  // 4. Admin queries Master Dashboard Analytics Overview (Section 25)
  console.log('4. Admin querying master analytics overview...');
  const analyticsRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(analyticsRes.status, 200);
  const analyticsData = await analyticsRes.json();
  assert.strictEqual(analyticsData.success, true);

  const { metrics, recentStudents, recentOrders, monthlyTrends, systemHealth } = analyticsData.data;

  // Validate metrics
  assert.ok(metrics.totalStudents > 0, 'Total students should be > 0');
  assert.ok(metrics.activeStudents > 0, 'Active students should be > 0');
  assert.ok(metrics.totalCourses > 0, 'Total courses should be > 0');
  assert.ok(metrics.totalEnrollments > 0, 'Total enrollments should be > 0');
  assert.ok(typeof metrics.totalRevenue === 'number', 'Total revenue must be numeric');
  console.log(`   ✓ Overview metrics: Students=${metrics.totalStudents} (${metrics.activeStudents} Active), Courses=${metrics.totalCourses}, Enrollments=${metrics.totalEnrollments}, Revenue=₹${metrics.totalRevenue}`);

  // Validate recent students list
  assert.ok(Array.isArray(recentStudents), 'Recent students must be an array');
  assert.ok(recentStudents.length > 0, 'Should have recent students');
  assert.ok(recentStudents[0].phone, 'Student must have phone');
  console.log(`   ✓ Recent student registrations: ${recentStudents.length} records retrieved.`);

  // Validate recent orders list
  assert.ok(Array.isArray(recentOrders), 'Recent orders must be an array');
  console.log(`   ✓ Recent orders: ${recentOrders.length} records retrieved.`);

  // Validate monthly trends
  assert.ok(Array.isArray(monthlyTrends), 'Monthly trends must be an array');
  console.log(`   ✓ Monthly trends data points: ${monthlyTrends.length}`);

  // Validate system health
  assert.strictEqual(systemHealth.status, 'OPERATIONAL');
  assert.strictEqual(systemHealth.database, 'CONNECTED');
  assert.ok(systemHealth.uptimeSeconds >= 0);
  assert.ok(systemHealth.memoryRssMb > 0);
  console.log(`   ✓ System health verified: Status=${systemHealth.status}, DB=${systemHealth.database}, Memory=${systemHealth.memoryRssMb}MB RSS`);

  // 5. Admin queries Student Progress Monitoring (Section 32)
  console.log('5. Admin querying individual student progress monitoring...');
  const progressRes = await fetch(`${API_BASE}/admin/students/${studentId}/progress`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(progressRes.status, 200);
  const progressData = await progressRes.json();
  assert.strictEqual(progressData.success, true);
  assert.strictEqual(progressData.data.student.id, studentId);
  assert.ok(Array.isArray(progressData.data.courses), 'Courses must be an array');
  assert.ok(progressData.data.courses.length > 0, 'Enrolled student should have course records');

  const courseItem = progressData.data.courses[0];
  assert.ok(typeof courseItem.progressPercent === 'number', 'Course item must include progress percentage');
  assert.ok(typeof courseItem.totalSubtopics === 'number', 'Course item must include total subtopics count');
  assert.ok(typeof courseItem.completedSubtopics === 'number', 'Course item must include completed subtopics count');
  console.log(`   ✓ Student course progress: Course="${courseItem.courseTitle}" Progress=${courseItem.progressPercent}% (${courseItem.completedSubtopics}/${courseItem.totalSubtopics} subtopics)`);

  // Check coding & mcq stats
  assert.ok(typeof progressData.data.codingStats.totalSubmissions === 'number');
  assert.ok(typeof progressData.data.mcqStats.totalAttempts === 'number');
  console.log(`   ✓ Coding & MCQ telemetry: Submissions=${progressData.data.codingStats.totalSubmissions}, MCQ Attempts=${progressData.data.mcqStats.totalAttempts}`);

  // 6. Admin queries Course Engagement Roster (Section 32)
  const courseId = courseItem.courseId;
  console.log(`6. Admin querying course engagement roster for Course ID=${courseId}...`);
  const engagementRes = await fetch(`${API_BASE}/admin/courses/${courseId}/engagement`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(engagementRes.status, 200);
  const engagementData = await engagementRes.json();
  assert.strictEqual(engagementData.success, true);
  assert.ok(engagementData.data.metrics.totalEnrolledStudents > 0);
  assert.ok(typeof engagementData.data.metrics.averageProgressPercent === 'number');
  assert.ok(Array.isArray(engagementData.data.students));
  console.log(`   ✓ Course engagement: Enrolled=${engagementData.data.metrics.totalEnrolledStudents}, Avg Progress=${engagementData.data.metrics.averageProgressPercent}%`);

  // 7. Admin queries Comprehensive Audit Logs (Section 33)
  console.log('7. Admin querying audit logs stream...');
  const auditRes = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(auditRes.status, 200);
  const auditData = await auditRes.json();
  assert.strictEqual(auditData.success, true);
  assert.ok(Array.isArray(auditData.data), 'Audit logs must be an array');
  assert.ok(auditData.data.length > 0, 'Audit logs must contain historical system actions');
  assert.ok(auditData.meta.total > 0, 'Total audit logs count must be > 0');
  assert.ok(Array.isArray(auditData.distinctActions), 'Distinct actions array must be present');
  console.log(`   ✓ Retrieved ${auditData.data.length} audit logs. Total in database: ${auditData.meta.total}. Distinct action types: ${auditData.distinctActions.length}`);

  // 8. Admin filters audit logs by action
  const sampleAction = auditData.distinctActions[0];
  console.log(`8. Admin filtering audit logs by action="${sampleAction}"...`);
  const filterAuditRes = await fetch(`${API_BASE}/admin/audit-logs?action=${encodeURIComponent(sampleAction)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(filterAuditRes.status, 200);
  const filterAuditData = await filterAuditRes.json();
  for (const item of filterAuditData.data) {
    assert.strictEqual(item.action, sampleAction, 'All returned items must match filtered action');
  }
  console.log(`   ✓ Filter by action verified: ${filterAuditData.data.length} entries match "${sampleAction}".`);

  // 9. Admin searches audit logs by keyword
  console.log('9. Admin searching audit logs with search query...');
  const searchAuditRes = await fetch(`${API_BASE}/admin/audit-logs?search=COURSE`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(searchAuditRes.status, 200);
  const searchAuditData = await searchAuditRes.json();
  assert.ok(Array.isArray(searchAuditData.data));
  console.log(`   ✓ Search filter verified: ${searchAuditData.data.length} matches found.`);

  // 10. Negative test: non-existent student progress returns 404
  console.log('10. Testing 404 on non-existent student progress query...');
  const nonExistentStudentRes = await fetch(`${API_BASE}/admin/students/00000000-0000-0000-0000-000000000000/progress`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(nonExistentStudentRes.status, 404);
  console.log('   ✓ Correctly returned 404 for non-existent student.');

  // 11. Negative test: non-existent course engagement returns 404
  console.log('11. Testing 404 on non-existent course engagement query...');
  const nonExistentCourseRes = await fetch(`${API_BASE}/admin/courses/00000000-0000-0000-0000-000000000000/engagement`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(nonExistentCourseRes.status, 404);
  console.log('   ✓ Correctly returned 404 for non-existent course.');

  // 12. Security test: Student token cannot view audit logs
  console.log('12. Security test: Student attempting to view audit logs...');
  const studentAuditRes = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentAuditRes.status, 403);
  console.log('   ✓ Audit logs strictly guarded by admin role-based authorization.');

  console.log('\n======================================================');
  console.log('🎉 ALL 12 PHASE 8 ANALYTICS & AUDIT TESTS PASSED!');
  console.log('======================================================\n');
}

runPhase8Tests().catch((err) => {
  console.error('❌ Phase 8 tests failed:', err);
  process.exit(1);
});
