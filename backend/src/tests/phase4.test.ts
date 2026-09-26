import assert from 'node:assert';

const API_BASE = 'http://localhost:5001/api/v1';

async function runPhase4Tests() {
  console.log('--- STARTING PHASE 4 AUTOMATED TESTS (COURSE LEARNING & PROGRESS) ---');

  // 1. Authenticate as Priya Patel (Active enrolled student)
  console.log('1. Authenticating as active enrolled student (Priya Patel)...');
  const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'priya.patel@example.com',
      password: 'Student@123',
    }),
  });
  const studentLoginData = await studentLoginRes.json();
  assert.strictEqual(studentLoginRes.status, 200, 'Student login should succeed');
  const studentToken = studentLoginData.data.accessToken;
  const studentId = studentLoginData.data.user.id;
  console.log('   ✓ Student authenticated. Token acquired.');

  // 2. Fetch student's enrolled courses to get courseId
  console.log("2. Fetching student's enrolled courses...");
  const coursesRes = await fetch(`${API_BASE}/student/courses`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const coursesData = await coursesRes.json();
  assert.strictEqual(coursesRes.status, 200);
  assert.ok(coursesData.data.length > 0, 'Student should have at least one enrolled course');
  const enrolledCourse = coursesData.data[0];
  const courseId = enrolledCourse.id;
  console.log(`   ✓ Enrolled course identified: "${enrolledCourse.title}" (ID: ${courseId})`);

  // 3. Admin creates another course to verify enrollment isolation
  console.log('3. Verifying enrollment authorization gate (Section 10 & 12)...');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@institute.edu',
      password: 'Admin@123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data.accessToken;

  // Create an unenrolled course
  const newCourseRes = await fetch(`${API_BASE}/admin/courses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Unenrolled Advanced Rust Systems',
      shortDescription: 'Low level systems engineering in Rust.',
      description: 'Comprehensive low-level systems programming using Rust, memory safety, and concurrency.',
      instructorName: 'Prof. David Miller',
      price: 8999,
      durationHours: 60,
    }),
  });
  const newCourseData = await newCourseRes.json();
  assert.strictEqual(newCourseRes.status, 201, 'Course creation should succeed');
  const unenrolledCourseId = newCourseData.data.id;

  // Attempt to access unenrolled course curriculum
  const unauthCurriculumRes = await fetch(
    `${API_BASE}/student/learning/courses/${unenrolledCourseId}/curriculum`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    }
  );
  assert.strictEqual(
    unauthCurriculumRes.status,
    403,
    'Unenrolled course access should return HTTP 403'
  );
  const unauthData = await unauthCurriculumRes.json();
  assert.strictEqual(unauthData.error, 'COURSE_NOT_ENROLLED');
  console.log('   ✓ Non-enrolled course curriculum access properly blocked with HTTP 403.');

  // 4. Fetch Enrolled Course Curriculum Hierarchy (Section 12 & 13)
  console.log('4. Fetching Syllabus Tree and Resume pointer (Section 12 & 13)...');
  const curriculumRes = await fetch(
    `${API_BASE}/student/learning/courses/${courseId}/curriculum`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    }
  );
  assert.strictEqual(curriculumRes.status, 200);
  const curriculumData = await curriculumRes.json();
  assert.strictEqual(curriculumData.success, true);
  assert.ok(curriculumData.data.topics.length > 0, 'Should have topics');
  assert.ok(curriculumData.data.lastAccessedSubtopicId, 'Should identify last accessed subtopic');
  console.log(`   ✓ Curriculum retrieved:`);
  console.log(`     Topics:               ${curriculumData.data.topics.length}`);
  console.log(`     Total Subtopics:      ${curriculumData.data.metrics.totalSubtopics}`);
  console.log(`     Completed Subtopics:  ${curriculumData.data.metrics.completedSubtopics}`);
  console.log(`     Progress:             ${curriculumData.data.metrics.progressPercentage}%`);
  console.log(`     Resume Subtopic ID:   ${curriculumData.data.lastAccessedSubtopicId}`);

  const activeSubtopicId = curriculumData.data.lastAccessedSubtopicId;

  // Attach sample content to activeSubtopicId if needed via admin to ensure full coverage
  const topic1 = curriculumData.data.topics[0];
  const subtopic1 = topic1.subtopics[0];

  // Let's ensure topic1.subtopics[0] has a video, coding problem, and MCQ for testing
  console.log('5. Ensuring subtopic has rich test content attached...');
  // Attach video if not present
  const videoAttachRes = await fetch(
    `${API_BASE}/admin/subtopics/${subtopic1.id}/videos`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Mastering JavaScript Execution Contexts & Memory',
        description: 'Deep dive into call stack, lexical scoping, and memory heap.',
        storageKey: 'courses/js/execution-context.mp4',
        durationSeconds: 1200,
        sortOrder: 1,
      }),
    }
  );
  assert.strictEqual(videoAttachRes.status, 201, 'Video attached');
  const videoData = await videoAttachRes.json();
  const videoId = videoData.data.id;

  // Attach coding problem with test cases
  const codingAttachRes = await fetch(
    `${API_BASE}/admin/subtopics/${subtopic1.id}/coding`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Array Element Summation',
        description: 'Read space-separated integers from input and output their sum.',
        inputFormat: 'Space-separated integers: "1 2 3 4 5"',
        outputFormat: 'Single integer sum: "15"',
        constraints: '1 <= N <= 1000',
        defaultCode: {
          javascript: 'const numbers = input.trim().split(/\\s+/).map(Number);\nconst sum = numbers.reduce((a, b) => a + b, 0);\nconsole.log(sum);',
        },
        allowedLanguages: ['javascript', 'python'],
        timeLimitMs: 2000,
        memoryLimitMb: 128,
        testCases: [
          { inputData: '1 2 3 4 5', expectedOutput: '15', isHidden: false },
          { inputData: '10 20 30', expectedOutput: '60', isHidden: false },
          { inputData: '100 -50 25', expectedOutput: '75', isHidden: true },
        ],
      }),
    }
  );
  assert.strictEqual(codingAttachRes.status, 201, 'Coding problem attached');
  const codingData = await codingAttachRes.json();
  const problemId = codingData.data.id;

  // Attach MCQ assessment
  const mcqAttachRes = await fetch(
    `${API_BASE}/admin/subtopics/${subtopic1.id}/mcqs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionText: 'Which keyword is used to declare a constant in modern JavaScript?',
        explanation: 'const creates block-scoped read-only references in ECMAScript.',
        points: 1,
        options: [
          { optionText: 'var', isCorrect: false },
          { optionText: 'let', isCorrect: false },
          { optionText: 'const', isCorrect: true },
          { optionText: 'define', isCorrect: false },
        ],
      }),
    }
  );
  assert.ok([201, 200].includes(mcqAttachRes.status), 'MCQ attached');

  // 6. Fetch Subtopic Learning Content as Student (Section 13 & 14 & 30)
  console.log('6. Fetching Subtopic Content bundle with signed video token (Section 14 & 30)...');
  const subtopicRes = await fetch(
    `${API_BASE}/student/learning/subtopics/${subtopic1.id}`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    }
  );
  assert.strictEqual(subtopicRes.status, 200);
  const subtopicBundle = await subtopicRes.json();
  assert.strictEqual(subtopicBundle.success, true);
  assert.ok(subtopicBundle.data.videos.length > 0, 'Should return videos');
  const studentVideo = subtopicBundle.data.videos[0];
  assert.ok(studentVideo.accessToken, 'Video should have an HMAC-SHA256 signed access token');
  assert.ok(studentVideo.streamUrl.includes('token='), 'Stream URL should include token');
  console.log(`   ✓ Video retrieved with secure token: ${studentVideo.accessToken.substring(0, 24)}...`);

  // Verify MCQs DO NOT leak correct answers to student
  assert.ok(subtopicBundle.data.mcqs.length > 0, 'Should return MCQs');
  const studentMcq = subtopicBundle.data.mcqs[0];
  for (const opt of studentMcq.options) {
    assert.strictEqual(
      (opt as any).isCorrect,
      undefined,
      'isCorrect MUST NOT be exposed in student MCQ endpoint'
    );
    assert.strictEqual(
      (opt as any).is_correct,
      undefined,
      'is_correct MUST NOT be exposed in student MCQ endpoint'
    );
  }
  console.log('   ✓ MCQ options verified: correct answers securely hidden from client.');

  // 7. Test Video Stream Authorization & Expiration (Section 30)
  console.log('7. Testing Video Security Stream verification (Section 30)...');
  const streamRes = await fetch(
    `http://localhost:5001${studentVideo.streamUrl}`
  );
  assert.strictEqual(streamRes.status, 200, 'Valid token should be authorized');
  const streamData = await streamRes.json();
  assert.strictEqual(streamData.videoId, studentVideo.id);

  // Test tampered token rejection
  const tamperedRes = await fetch(
    `${API_BASE}/student/learning/videos/${studentVideo.id}/stream?token=invalid_tampered_token_xyz`
  );
  assert.strictEqual(tamperedRes.status, 403, 'Tampered token must be rejected with HTTP 403');
  console.log('   ✓ Video token security: authentic token authorized, tampered token rejected.');

  // 8. Track Video Playback Progress (Section 14)
  console.log('8. Tracking Video Watch Progress & Auto-completion (Section 14)...');
  const progressRes = await fetch(
    `${API_BASE}/student/learning/videos/${studentVideo.id}/progress`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        watchSeconds: 1100,
        lastPositionSeconds: 1100,
        durationSeconds: 1200,
      }),
    }
  );
  assert.strictEqual(progressRes.status, 200);
  const progressData = await progressRes.json();
  assert.strictEqual(progressData.data.isCompleted, true, 'Watch >90% should auto-complete video');
  console.log('   ✓ Video progress recorded (1100s / 1200s). Auto-completed: TRUE.');

  // 9. Coding Sandbox: Run Code with Sample Cases (Section 16 & 31)
  console.log('9. Testing Coding Execution Sandbox (JavaScript runner, Section 16 & 31)...');
  const runCodeRes = await fetch(
    `${API_BASE}/student/learning/coding/${problemId}/run`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'const numbers = input.trim().split(/\\s+/).map(Number);\nconsole.log(numbers.reduce((a, b) => a + b, 0));',
        language: 'javascript',
      }),
    }
  );
  assert.strictEqual(runCodeRes.status, 200);
  const runCodeData = await runCodeRes.json();
  assert.strictEqual(runCodeData.data.status, 'ACCEPTED');
  assert.strictEqual(runCodeData.data.testCasesPassed, 2);
  console.log(`   ✓ Code runner executed in sandbox. Public test cases passed: ${runCodeData.data.testCasesPassed}/2.`);

  // 10. Coding Sandbox: Infinite Loop Timeout Security (Section 31)
  console.log('10. Testing Sandbox Timeout Protection (2-second limit against infinite loops)...');
  const timeoutCodeRes = await fetch(
    `${API_BASE}/student/learning/coding/${problemId}/run`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'while (true) {}',
        language: 'javascript',
      }),
    }
  );
  assert.strictEqual(timeoutCodeRes.status, 200);
  const timeoutData = await timeoutCodeRes.json();
  assert.strictEqual(
    timeoutData.data.status,
    'TIME_LIMIT_EXCEEDED',
    'Infinite loop must trigger TIME_LIMIT_EXCEEDED'
  );
  console.log('   ✓ Runaway process contained and terminated: TIME_LIMIT_EXCEEDED.');

  // 11. Coding Sandbox: Submit Solution against Hidden Test Cases (Section 16 & 31)
  console.log('11. Submitting Code Solution for formal scoring...');
  const submitCodeRes = await fetch(
    `${API_BASE}/student/learning/coding/${problemId}/submit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'const numbers = input.trim().split(/\\s+/).map(Number);\nconsole.log(numbers.reduce((a, b) => a + b, 0));',
        language: 'javascript',
      }),
    }
  );
  assert.strictEqual(submitCodeRes.status, 200);
  const submitData = await submitCodeRes.json();
  assert.strictEqual(submitData.data.status, 'ACCEPTED');
  assert.strictEqual(submitData.data.score, 100);
  assert.strictEqual(submitData.data.testCasesPassed, 3);
  console.log(`   ✓ Submission evaluated: Status: ${submitData.data.status}, Score: ${submitData.data.score}%, Passed: ${submitData.data.testCasesPassed}/${submitData.data.totalTestCases}.`);

  // 12. MCQ Quiz Submission & Instant Scoring (Section 17)
  console.log('12. Submitting MCQ Quiz Assessment (Section 17)...');
  // Answer all questions accurately
  const answers = subtopicBundle.data.mcqs.map((q: any) => {
    let chosenOption = q.options.find((o: any) => o.text === 'const');
    if (!chosenOption) {
      chosenOption = q.options.find((o: any) => o.text === 'number');
    }
    if (!chosenOption) {
      chosenOption = q.options[0];
    }
    return {
      questionId: q.id,
      selectedOptionId: chosenOption.id,
    };
  });

  const submitMcqRes = await fetch(
    `${API_BASE}/student/learning/mcqs/${subtopic1.id}/submit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers }),
    }
  );
  assert.strictEqual(submitMcqRes.status, 200);
  const mcqResult = await submitMcqRes.json();
  assert.strictEqual(mcqResult.data.passed, true);
  assert.strictEqual(mcqResult.data.score, mcqResult.data.totalQuestions);
  assert.strictEqual(mcqResult.data.percentage, 100);
  assert.ok(mcqResult.data.review[0].explanation.length > 0);
  console.log(`   ✓ MCQ Quiz scored: ${mcqResult.data.score}/${mcqResult.data.totalQuestions} (${mcqResult.data.percentage}%), Passed: ${mcqResult.data.passed}`);

  // 13. Mark Subtopic Complete (Section 14 & 15)
  console.log('13. Marking Subtopic as Complete (Section 14 & 15)...');
  const completeRes = await fetch(
    `${API_BASE}/student/learning/subtopics/${subtopic1.id}/complete`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isCompleted: true }),
    }
  );
  assert.strictEqual(completeRes.status, 200);
  const completeData = await completeRes.json();
  assert.strictEqual(completeData.data.isCompleted, true);
  console.log(`   ✓ Subtopic marked complete. Updated course progress: ${completeData.data.progressPercentage}%.`);

  console.log('\n=========================================');
  console.log('ALL PHASE 4 BACKEND API TESTS PASSED! (13/13)');
  console.log('=========================================\n');
}

runPhase4Tests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
