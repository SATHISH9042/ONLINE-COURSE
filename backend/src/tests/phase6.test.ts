import assert from 'node:assert';

const API_BASE = 'http://localhost:5001/api/v1';

async function runPhase6Tests() {
  console.log('--- STARTING PHASE 6 AUTOMATED TESTS (LIVE CLASSES & RECORDINGS) ---');

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

  // 2. Student login (Priya Patel - Active student)
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
  console.log('   ✓ Student authenticated.');

  // 3. Validation test: End time before start time should fail
  console.log('3. Testing scheduling validation (end time before start time)...');
  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // +24h
  const invalidEndTime = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString(); // +23h (before start)

  const invalidScheduleRes = await fetch(`${API_BASE}/admin/live-classes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instructorName: 'Dr. Alan Turing',
      title: 'Invalid Time Class',
      startTime,
      endTime: invalidEndTime,
      meetingLink: 'https://meet.google.com/xyz-abcd-efg',
    }),
  });
  assert.strictEqual(invalidScheduleRes.status, 400);
  const invalidData = await invalidScheduleRes.json();
  assert.strictEqual(invalidData.code, 'INVALID_TIME_RANGE');
  console.log('   ✓ Correctly rejected invalid start/end time range with 400.');

  // 4. Admin schedules valid live class
  console.log('4. Admin scheduling valid live class...');
  const validEndTime = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(); // +26h
  const scheduleRes = await fetch(`${API_BASE}/admin/live-classes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instructorName: 'Prof. Ada Lovelace',
      title: 'Advanced System Design & Distributed Systems',
      description: 'Deep dive into event-driven architecture, CQRS, and Paxos consensus.',
      startTime,
      endTime: validEndTime,
      meetingLink: 'https://meet.google.com/sys-desn-live',
      maxParticipants: 250,
    }),
  });
  const scheduleData = await scheduleRes.json();
  assert.strictEqual(scheduleRes.status, 201);
  assert.strictEqual(scheduleData.success, true);
  assert.strictEqual(scheduleData.data.status, 'UPCOMING');
  const liveClassId = scheduleData.data.id;
  console.log(`   ✓ Live class scheduled successfully: ID=${liveClassId}`);

  // 5. Student queries live classes - verifies class appears in upcoming
  console.log('5. Student querying live classes schedule...');
  const studentClassesRes = await fetch(`${API_BASE}/student/live-classes`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentClassesRes.status, 200);
  const studentClassesData = await studentClassesRes.json();
  assert.strictEqual(studentClassesData.success, true);
  const foundUpcoming = studentClassesData.data.upcoming.find((c: any) => c.id === liveClassId);
  assert.ok(foundUpcoming, 'Scheduled class must appear in student upcoming list');
  assert.strictEqual(foundUpcoming.title, 'Advanced System Design & Distributed Systems');
  assert.strictEqual(foundUpcoming.meeting_link, 'https://meet.google.com/sys-desn-live');
  console.log('   ✓ Student sees class in upcoming schedule with active meeting link.');

  // 6. Admin updates class status to LIVE
  console.log('6. Admin transitioning class status UPCOMING -> LIVE...');
  const updateToLiveRes = await fetch(`${API_BASE}/admin/live-classes/${liveClassId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'LIVE',
    }),
  });
  assert.strictEqual(updateToLiveRes.status, 200);
  const updateToLiveData = await updateToLiveRes.json();
  assert.strictEqual(updateToLiveData.data.status, 'LIVE');
  console.log('   ✓ Status updated to LIVE.');

  // 7. Student checks live classes - class now in `live` array
  console.log('7. Student verifying live class appears in active LIVE section...');
  const studentLiveRes = await fetch(`${API_BASE}/student/live-classes`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentLiveData = await studentLiveRes.json();
  const foundLive = studentLiveData.data.live.find((c: any) => c.id === liveClassId);
  assert.ok(foundLive, 'Class must now appear in student live array');
  console.log('   ✓ Class confirmed broadcasting in student LIVE section.');

  // 8. Admin attaches recorded live session
  console.log('8. Admin uploading and attaching recording to live class...');
  const recordingRes = await fetch(`${API_BASE}/admin/live-classes/${liveClassId}/recordings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Full Recording: Advanced System Design & Distributed Systems',
      storageKey: 'recordings/sys-design-2026-09.mp4',
      durationSeconds: 5040, // 1h 24m (5040s)
    }),
  });
  assert.strictEqual(recordingRes.status, 201);
  const recordingData = await recordingRes.json();
  assert.strictEqual(recordingData.success, true);
  assert.strictEqual(recordingData.data.durationFormatted, '1h 24m');
  const recordingId = recordingData.data.id;
  console.log(`   ✓ Recording attached: ID=${recordingId}, DurationFormatted=${recordingData.data.durationFormatted}`);

  // 9. Student retrieves past recordings and verifies stream URL
  console.log('9. Student verifying recorded session appears in library...');
  const studentRecsRes = await fetch(`${API_BASE}/student/live-classes`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentRecsData = await studentRecsRes.json();
  const foundRecording = studentRecsData.data.recordings.find((r: any) => r.id === recordingId);
  assert.ok(foundRecording, 'Recording must appear in student recordings list');
  assert.strictEqual(foundRecording.durationFormatted, '1h 24m');
  assert.ok(foundRecording.streamUrl, 'Recording must include valid playable stream URL');
  // Check that the class transitioned to past/completed
  const foundPast = studentRecsData.data.past.find((c: any) => c.id === liveClassId);
  assert.ok(foundPast, 'Completed class must appear in student past classes');
  console.log('   ✓ Student recording retrieved with stream URL and 1h 24m duration.');

  // 10. Admin lists live classes - verifies recording count
  console.log('10. Admin verifying live classes list with recording aggregation...');
  const adminListRes = await fetch(`${API_BASE}/admin/live-classes`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminListRes.status, 200);
  const adminListData = await adminListRes.json();
  const foundAdminClass = adminListData.data.find((c: any) => c.id === liveClassId);
  assert.ok(foundAdminClass, 'Class must appear in admin list');
  assert.strictEqual(foundAdminClass.recordingCount, 1);
  assert.strictEqual(foundAdminClass.recordings.length, 1);
  console.log('   ✓ Admin list aggregates recordings count and details correctly.');

  // 11. Admin deletes recording
  console.log('11. Admin deleting recording...');
  const delRecRes = await fetch(`${API_BASE}/admin/recordings/${recordingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(delRecRes.status, 200);
  console.log('   ✓ Recording deleted successfully.');

  // 12. Admin deletes live class
  console.log('12. Admin deleting live class...');
  const delClassRes = await fetch(`${API_BASE}/admin/live-classes/${liveClassId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(delClassRes.status, 200);
  console.log('   ✓ Live class deleted successfully.');

  console.log('\n======================================================');
  console.log('🎉 ALL 12 PHASE 6 LIVE CLASS & RECORDING TESTS PASSED!');
  console.log('======================================================\n');
}

runPhase6Tests().catch((err) => {
  console.error('❌ Phase 6 tests failed:', err);
  process.exit(1);
});
