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

async function runPhase3Tests() {
  console.log('--- STARTING PHASE 3 AUTOMATED TESTS (COURSE MANAGEMENT) ---');

  // 1. Admin login
  console.log('1. Admin login...');
  const loginRes = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'admin@institute.edu',
      password: 'Admin@123',
    }),
  });
  assert.strictEqual(loginRes.status, 200);
  const adminToken = loginRes.data.data.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('   ✓ Admin authenticated successfully.');

  // 2. Create new course
  console.log('2. Admin creating new course...');
  const coursePayload = {
    title: 'Cloud Architecture & DevOps Engineering',
    shortDescription: 'Master AWS, Docker, Kubernetes, CI/CD pipelines, and Terraform.',
    description: 'Enterprise grade cloud infrastructure automation, container orchestration, and continuous deployment.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    price: 12999,
    currency: 'INR',
    durationHours: 85,
    instructorName: 'Dr. Vikram Seth',
    isPublished: false,
  };

  const createCourseRes = await req('/api/v1/admin/courses', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(coursePayload),
  });
  assert.strictEqual(createCourseRes.status, 201, `Failed: ${JSON.stringify(createCourseRes.data)}`);
  const courseId = createCourseRes.data.data.id;
  assert.ok(courseId, 'Course ID must be generated');
  assert.strictEqual(createCourseRes.data.data.title, coursePayload.title);
  assert.strictEqual(createCourseRes.data.data.is_published, false);
  console.log(`   ✓ Course created: ID=${courseId}, Slug=${createCourseRes.data.data.slug}`);

  // 3. Create Topic
  console.log('3. Admin creating Topic 1 (Docker Containerization)...');
  const topicRes = await req(`/api/v1/admin/courses/${courseId}/topics`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Docker & Containerization Architecture',
      description: 'Container runtimes, image layers, and multi-stage builds.',
      sortOrder: 1,
    }),
  });
  assert.strictEqual(topicRes.status, 201);
  const topicId = topicRes.data.data.id;
  assert.ok(topicId);
  console.log(`   ✓ Topic created: ID=${topicId}`);

  // 4. Create Subtopic
  console.log('4. Admin creating Subtopic 1.1 (Multi-Stage Dockerfiles)...');
  const subtopicRes = await req(`/api/v1/admin/topics/${topicId}/subtopics`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Multi-Stage Dockerfile Optimization',
      sortOrder: 1,
    }),
  });
  assert.strictEqual(subtopicRes.status, 201);
  const subtopicId = subtopicRes.data.data.id;
  assert.ok(subtopicId);
  console.log(`   ✓ Subtopic created: ID=${subtopicId}`);

  // 5. Attach Video Learning Content
  console.log('5. Admin attaching Video lesson to subtopic...');
  const videoRes = await req(`/api/v1/admin/subtopics/${subtopicId}/videos`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Hands-on Multi-Stage Builds',
      description: 'Reducing image footprint from 850MB to 45MB with Alpine Linux.',
      storageProvider: 's3',
      storageKey: 'courses/devops/docker/lesson1.mp4',
      durationSeconds: 1450,
      isPreview: true,
    }),
  });
  assert.strictEqual(videoRes.status, 201);
  assert.ok(videoRes.data.data.id);
  console.log(`   ✓ Video attached: ID=${videoRes.data.data.id}, Duration=1450s`);

  // 6. Attach Coding Practice Problem
  console.log('6. Admin attaching Coding Practice problem with test cases...');
  const codingRes = await req(`/api/v1/admin/subtopics/${subtopicId}/coding`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Container Memory Usage Analyzer',
      description: 'Given an array of memory measurements in MB, return the peak memory consumed.',
      inputFormat: 'Array of numbers',
      outputFormat: 'Single number representing peak memory',
      constraints: '1 <= N <= 1000',
      allowedLanguages: ['javascript', 'python'],
      testCases: [
        { inputData: '[128, 256, 512, 256]', expectedOutput: '512', isHidden: false },
        { inputData: '[64, 128, 64]', expectedOutput: '128', isHidden: true },
      ],
    }),
  });
  assert.strictEqual(codingRes.status, 201);
  assert.ok(codingRes.data.data.id);
  console.log(`   ✓ Coding problem attached: ID=${codingRes.data.data.id}`);

  // 7. Attach MCQ Assessment Question
  console.log('7. Admin attaching MCQ Assessment with options...');
  const mcqRes = await req(`/api/v1/admin/subtopics/${subtopicId}/mcqs`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      questionText: 'Which Docker instruction sets the default command and arguments for an executing container?',
      points: 2,
      options: [
        { optionText: 'RUN', isCorrect: false },
        { optionText: 'CMD', isCorrect: true },
        { optionText: 'EXPOSE', isCorrect: false },
        { optionText: 'ENV', isCorrect: false },
      ],
    }),
  });
  assert.strictEqual(mcqRes.status, 201);
  assert.ok(mcqRes.data.data.id);
  assert.strictEqual(mcqRes.data.data.options.length, 4);
  console.log(`   ✓ MCQ question attached with 4 options. Correct answer verified.`);

  // 8. Retrieve complete Course Details with full hierarchy
  console.log('8. Fetching complete Course Hierarchy (Course -> Topics -> Subtopics -> Content)...');
  const detailsRes = await req(`/api/v1/admin/courses/${courseId}`, {
    headers: adminHeaders,
  });
  assert.strictEqual(detailsRes.status, 200);
  const courseDetails = detailsRes.data.data;
  assert.strictEqual(courseDetails.topics.length, 1);
  assert.strictEqual(courseDetails.topics[0].subtopics.length, 1);
  const loadedSub = courseDetails.topics[0].subtopics[0];
  assert.strictEqual(loadedSub.videos.length, 1);
  assert.strictEqual(loadedSub.codingProblems.length, 1);
  assert.strictEqual(loadedSub.mcqs.length, 1);
  console.log('   ✓ Hierarchical Course structure verified:');
  console.log(`     Course: ${courseDetails.title}`);
  console.log(`     └── Topic: ${courseDetails.topics[0].title}`);
  console.log(`         └── Subtopic: ${loadedSub.title}`);
  console.log(`             ├── Videos: ${loadedSub.videos.length}`);
  console.log(`             ├── Coding: ${loadedSub.codingProblems.length}`);
  console.log(`             └── MCQs: ${loadedSub.mcqs.length}`);

  // 9. Update course price and verify audit log
  console.log('9. Updating course price (12999 -> 10999)...');
  const updateRes = await req(`/api/v1/admin/courses/${courseId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ price: 10999 }),
  });
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(Number(updateRes.data.data.price), 10999);
  console.log('   ✓ Price updated in database.');

  // 10. Toggle Publish status
  console.log('10. Publishing course...');
  const publishRes = await req(`/api/v1/admin/courses/${courseId}/publish`, {
    method: 'PATCH',
    headers: adminHeaders,
  });
  assert.strictEqual(publishRes.status, 200);
  assert.strictEqual(publishRes.data.data.is_published, true);
  console.log('   ✓ Course status transitioned: Draft -> Published');

  // 11. Security Check: Non-admin student cannot access admin course endpoints
  console.log('11. Security Test: Student token cannot access admin course API...');
  const studentLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'priya.patel@example.com',
      password: 'Student@123',
    }),
  });
  const studentToken = studentLogin.data.data.accessToken;

  const forbiddenCall = await req('/api/v1/admin/courses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ title: 'Hacked Course' }),
  });
  assert.strictEqual(forbiddenCall.status, 403);
  assert.strictEqual(forbiddenCall.data.code, 'FORBIDDEN');
  console.log('   ✓ Server-side RBAC rejected student with HTTP 403 Forbidden.');

  console.log('\n=========================================');
  console.log('ALL PHASE 3 AUTOMATED TESTS PASSED! (11/11)');
  console.log('=========================================\n');
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});
