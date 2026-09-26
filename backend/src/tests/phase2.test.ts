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

async function runPhase2Tests() {
  console.log('--- STARTING PHASE 2 AUTOMATED TESTS ---');

  // Test 1: Student Login
  console.log('1. Logging in as active sample student (Priya Patel)...');
  const loginRes = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'priya.patel@example.com',
      password: 'Student@123',
    }),
  });
  assert.strictEqual(loginRes.status, 200, `Login failed: ${JSON.stringify(loginRes.data)}`);
  const studentToken = loginRes.data.data.accessToken;
  assert.ok(studentToken, 'Token received');
  console.log('   ✓ Student authenticated successfully.');

  // Test 2: Section 7 - Student Dashboard Summary
  console.log('2. Fetching Section 7 Home Dashboard summary...');
  const dashRes = await req('/api/v1/student/dashboard', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(dashRes.status, 200);
  assert.strictEqual(dashRes.data.success, true);

  const dashData = dashRes.data.data;
  assert.ok(dashData.continueLearning, 'continueLearning widget must exist');
  assert.strictEqual(dashData.continueLearning.courseTitle, 'Full Stack Web Development');
  assert.strictEqual(dashData.continueLearning.subtopicTitle, 'Functions & Closures');
  assert.strictEqual(typeof dashData.continueLearning.progressPercent, 'number');
  assert.ok(Array.isArray(dashData.enrolledCourses), 'enrolledCourses must be array');
  assert.strictEqual(dashData.enrolledCourses.length >= 1, true);
  assert.strictEqual(dashData.stats.enrolledCoursesCount >= 1, true);
  console.log('   ✓ Section 7 Continue Learning widget verified:');
  console.log(`     Course:   ${dashData.continueLearning.courseTitle}`);
  console.log(`     Topic:    ${dashData.continueLearning.topicTitle}`);
  console.log(`     Subtopic: ${dashData.continueLearning.subtopicTitle}`);
  console.log(`     Progress: ${dashData.continueLearning.progressPercent}%`);

  // Test 3: Section 8 - My Courses
  console.log('3. Fetching Section 8 My Courses list...');
  const coursesRes = await req('/api/v1/student/courses', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(coursesRes.status, 200);
  assert.ok(Array.isArray(coursesRes.data.data));
  const firstCourse = coursesRes.data.data[0];
  assert.ok(firstCourse.title);
  assert.ok(firstCourse.thumbnailUrl);
  assert.ok(firstCourse.instructorName);
  assert.strictEqual(typeof firstCourse.completedSubtopics, 'number');
  assert.strictEqual(typeof firstCourse.totalSubtopics, 'number');
  assert.strictEqual(typeof firstCourse.progressPercent, 'number');
  assert.strictEqual(firstCourse.lastAccessedLesson, 'Functions & Closures');
  console.log('   ✓ Section 8 Course card metrics verified:');
  console.log(`     Title:     ${firstCourse.title}`);
  console.log(`     Lessons:   ${firstCourse.completedSubtopics} / ${firstCourse.totalSubtopics} completed`);
  console.log(`     Last:      ${firstCourse.lastAccessedLesson}`);

  // Test 4: Section 23 - Student Profile
  console.log('4. Fetching Section 23 Student Profile...');
  const profileRes = await req('/api/v1/student/profile', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(profileRes.status, 200);
  assert.strictEqual(profileRes.data.data.full_name, 'Priya Patel');
  assert.strictEqual(profileRes.data.data.status, 'ACTIVE');
  assert.strictEqual(profileRes.data.data.phone, '+919888877777');
  console.log('   ✓ Student Profile retrieved successfully.');

  // Test 5: Section 23 - Update Profile
  console.log('5. Updating allowed student profile fields...');
  const updateRes = await req('/api/v1/student/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      fullName: 'Priya Patel (Updated)',
      city: 'Pune',
      state: 'Maharashtra',
      bio: 'Enthusiastic full-stack engineer mastering React and PostgreSQL.',
    }),
  });
  assert.strictEqual(updateRes.status, 200);

  const updatedProfile = await req('/api/v1/student/profile', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(updatedProfile.data.data.full_name, 'Priya Patel (Updated)');
  assert.strictEqual(updatedProfile.data.data.city, 'Pune');
  assert.strictEqual(updatedProfile.data.data.phone, '+919888877777'); // Unchanged
  console.log('   ✓ Profile fields updated, sensitive phone remains restricted.');

  // Test 6: Section 24 - FAQs
  console.log('6. Fetching Section 24 Help FAQs...');
  const faqRes = await req('/api/v1/faqs');
  assert.strictEqual(faqRes.status, 200);
  assert.ok(Array.isArray(faqRes.data.data));
  assert.strictEqual(faqRes.data.data.length >= 4, true);
  console.log(`   ✓ Retrieved ${faqRes.data.data.length} published institute FAQs.`);

  // Test 7: Role Authorization Enforcement
  console.log('7. Verifying Admin cannot access Student Dashboard routes...');
  const adminLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'admin@institute.edu',
      password: 'Admin@123',
    }),
  });
  const adminToken = adminLogin.data.data.accessToken;
  const adminCall = await req('/api/v1/student/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminCall.status, 403);
  assert.strictEqual(adminCall.data.code, 'FORBIDDEN');
  console.log('   ✓ Role-based access control properly rejected admin from student endpoint.');

  console.log('\n=========================================');
  console.log('ALL PHASE 2 AUTOMATED TESTS PASSED! (7/7)');
  console.log('=========================================\n');
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
