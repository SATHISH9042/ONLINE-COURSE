import { Request, Response } from 'express';
import { db } from '../database/db';
import { generateSignedVideoToken, verifySignedVideoToken } from '../utils/videoSecurity';
import { evaluateCodeWithTestCases, runCode } from '../utils/codeSandbox';
import { z } from 'zod';

/**
 * Helper to verify that a student has an ACTIVE enrollment in a course
 */
async function verifyEnrollment(studentId: string, courseId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT id FROM course_enrollments
     WHERE student_id = $1 AND course_id = $2 AND status = 'ACTIVE'`,
    [studentId, courseId]
  );
  return result.rowCount > 0;
}

/**
 * Helper to find courseId from a subtopicId
 */
async function getCourseIdFromSubtopic(subtopicId: string): Promise<string | null> {
  const result = await db.query(
    `SELECT ct.course_id
     FROM course_subtopics cs
     JOIN course_topics ct ON ct.id = cs.topic_id
     WHERE cs.id = $1`,
    [subtopicId]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0].course_id;
}

/**
 * Section 12 & 13: Course Learning Interface - Curriculum Tree
 * Returns full course hierarchy with subtopic completion checkmarks, counts, and last accessed subtopic.
 */
export async function getCourseCurriculum(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const courseId = req.params.courseId as string;

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    // Verify enrollment
    const isEnrolled = await verifyEnrollment(studentId, courseId);
    if (!isEnrolled) {
      res.status(403).json({
        error: 'COURSE_NOT_ENROLLED',
        message: 'You do not have an active enrollment in this course.',
      });
      return;
    }

    // Fetch Course info
    const courseRes = await db.query(
      `SELECT id, title, slug, description, thumbnail_url, duration_hours
       FROM courses WHERE id = $1 AND deleted_at IS NULL`,
      [courseId]
    );

    if (courseRes.rowCount === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Course not found' });
      return;
    }

    const course = courseRes.rows[0];

    // Fetch Topics
    const topicsRes = await db.query(
      `SELECT id, title, description, sort_order
       FROM course_topics
       WHERE course_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [courseId]
    );

    // Fetch Subtopics with completion status and content counts
    const subtopicsRes = await db.query(
      `SELECT 
         cs.id,
         cs.topic_id,
         cs.title,
         cs.sort_order,
         COALESCE(sp.is_completed, FALSE) AS is_completed,
         sp.completed_at,
         sp.last_accessed_at,
         (SELECT COUNT(*) FROM videos v WHERE v.subtopic_id = cs.id) AS video_count,
         (SELECT COUNT(*) FROM coding_problems cp WHERE cp.subtopic_id = cs.id) AS coding_count,
         (SELECT COUNT(*) FROM mcq_questions mq WHERE mq.subtopic_id = cs.id) AS mcq_count
       FROM course_subtopics cs
       JOIN course_topics ct ON ct.id = cs.topic_id
       LEFT JOIN student_progress sp ON sp.subtopic_id = cs.id AND sp.student_id = $2
       WHERE ct.course_id = $1
       ORDER BY ct.sort_order ASC, cs.sort_order ASC, cs.created_at ASC`,
      [courseId, studentId]
    );

    // Calculate overall stats
    const totalSubtopics = subtopicsRes.rows.length;
    const completedSubtopics = subtopicsRes.rows.filter((st: any) => st.is_completed).length;
    const progressPercentage =
      totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

    // Identify last accessed subtopic (or default to first subtopic per Section 13)
    let lastAccessedSubtopicId = null;
    const accessedSubtopics = subtopicsRes.rows
      .filter((st: any) => st.last_accessed_at)
      .sort(
        (a: any, b: any) =>
          new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
      );

    if (accessedSubtopics.length > 0) {
      lastAccessedSubtopicId = accessedSubtopics[0].id;
    } else if (subtopicsRes.rows.length > 0) {
      lastAccessedSubtopicId = subtopicsRes.rows[0].id;
    }

    // Build hierarchy
    const topicsMap = new Map<string, any>();
    for (const t of topicsRes.rows) {
      topicsMap.set(t.id, {
        ...t,
        subtopics: [],
      });
    }

    for (const st of subtopicsRes.rows) {
      const topic = topicsMap.get(st.topic_id);
      if (topic) {
        topic.subtopics.push({
          id: st.id,
          title: st.title,
          sort_order: st.sort_order,
          is_completed: Boolean(st.is_completed),
          completed_at: st.completed_at,
          last_accessed_at: st.last_accessed_at,
          activities: {
            videos: parseInt(st.video_count, 10) || 0,
            coding: parseInt(st.coding_count, 10) || 0,
            mcqs: parseInt(st.mcq_count, 10) || 0,
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        course,
        topics: Array.from(topicsMap.values()),
        metrics: {
          totalSubtopics,
          completedSubtopics,
          progressPercentage,
        },
        lastAccessedSubtopicId,
      },
    });
  } catch (err: any) {
    console.error('[getCourseCurriculum Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 13 & 14 & 16 & 17: Get Subtopic Learning Content
 * Returns videos with signed access tokens, coding problems with student submissions,
 * MCQs without answers, and navigation pointers.
 */
export async function getSubtopicContent(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const subtopicId = req.params.subtopicId as string;

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    // Get Course ID
    const courseId = await getCourseIdFromSubtopic(subtopicId);
    if (!courseId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Subtopic not found' });
      return;
    }

    // Verify enrollment
    const isEnrolled = await verifyEnrollment(studentId, courseId);
    if (!isEnrolled) {
      res.status(403).json({
        error: 'COURSE_NOT_ENROLLED',
        message: 'You do not have an active enrollment in this course.',
      });
      return;
    }

    // Update last_accessed_at for this subtopic
    await db.query(
      `INSERT INTO student_progress (student_id, subtopic_id, last_accessed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (student_id, subtopic_id)
       DO UPDATE SET last_accessed_at = NOW()`,
      [studentId, subtopicId]
    );

    // Fetch Subtopic and Topic details
    const subtopicRes = await db.query(
      `SELECT cs.id, cs.title, cs.sort_order, cs.topic_id,
              ct.title AS topic_title, ct.course_id,
              COALESCE(sp.is_completed, FALSE) AS is_completed,
              sp.completed_at
       FROM course_subtopics cs
       JOIN course_topics ct ON ct.id = cs.topic_id
       LEFT JOIN student_progress sp ON sp.subtopic_id = cs.id AND sp.student_id = $2
       WHERE cs.id = $1`,
      [subtopicId, studentId]
    );

    if (subtopicRes.rowCount === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Subtopic not found' });
      return;
    }

    const subtopic = subtopicRes.rows[0];

    // Fetch Videos with secure signed tokens & progress
    const videosRes = await db.query(
      `SELECT v.id, v.title, v.description, v.duration_seconds, v.sort_order, v.storage_key,
              COALESCE(vp.watch_seconds, 0) AS watch_seconds,
              COALESCE(vp.last_position_seconds, 0) AS last_position_seconds,
              COALESCE(vp.is_completed, FALSE) AS is_completed
       FROM videos v
       LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.student_id = $2
       WHERE v.subtopic_id = $1
       ORDER BY v.sort_order ASC, v.created_at ASC`,
      [subtopicId, studentId]
    );

    const videos = videosRes.rows.map((v: any) => {
      // Generate HMAC-SHA256 signed expiring token (1 hour TTL)
      const token = generateSignedVideoToken(studentId, v.id, v.storage_key, 3600);
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        durationSeconds: v.duration_seconds,
        sortOrder: v.sort_order,
        watchSeconds: v.watch_seconds,
        lastPositionSeconds: v.last_position_seconds,
        isCompleted: Boolean(v.is_completed),
        accessToken: token,
        streamUrl: `/api/v1/student/learning/videos/${v.id}/stream?token=${token}`,
      };
    });

    // Fetch Coding Problems with public test cases & student's latest submission
    const codingRes = await db.query(
      `SELECT id, title, description, input_format, output_format, constraints,
              default_code, allowed_languages, time_limit_ms, memory_limit_mb, sort_order
       FROM coding_problems
       WHERE subtopic_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [subtopicId]
    );

    const codingProblems = [];
    for (const cp of codingRes.rows) {
      // Fetch public test cases
      const tcRes = await db.query(
        `SELECT id, input_data, expected_output, is_hidden, sort_order
         FROM coding_test_cases
         WHERE problem_id = $1 AND is_hidden = FALSE
         ORDER BY sort_order ASC`,
        [cp.id]
      );

      // Fetch latest submission from student
      const subRes = await db.query(
        `SELECT id, code, language, status, test_cases_passed, total_test_cases, score, submitted_at
         FROM coding_submissions
         WHERE student_id = $1 AND problem_id = $2
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [studentId, cp.id]
      );

      codingProblems.push({
        id: cp.id,
        title: cp.title,
        description: cp.description,
        inputFormat: cp.input_format,
        outputFormat: cp.output_format,
        constraints: cp.constraints,
        defaultCode: cp.default_code,
        allowedLanguages: cp.allowed_languages,
        timeLimitMs: cp.time_limit_ms,
        memoryLimitMb: cp.memory_limit_mb,
        testCases: tcRes.rows.map((t: any) => ({
          id: t.id,
          input: t.input_data,
          expectedOutput: t.expected_output,
        })),
        latestSubmission: subRes.rowCount > 0 ? subRes.rows[0] : null,
      });
    }

    // Fetch MCQs without leaking is_correct
    const mcqRes = await db.query(
      `SELECT id, question_text, points, sort_order
       FROM mcq_questions
       WHERE subtopic_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [subtopicId]
    );

    const mcqs = [];
    for (const q of mcqRes.rows) {
      // Fetch options without is_correct column
      const optRes = await db.query(
        `SELECT id, option_text, sort_order
         FROM mcq_options
         WHERE question_id = $1
         ORDER BY sort_order ASC`,
        [q.id]
      );

      mcqs.push({
        id: q.id,
        questionText: q.question_text,
        points: q.points,
        options: optRes.rows.map((o: any) => ({
          id: o.id,
          text: o.option_text,
        })),
      });
    }

    // Fetch student's latest MCQ attempt
    const latestAttemptRes = await db.query(
      `SELECT id, score, total_questions, percentage, passed, attempt_number, created_at
       FROM mcq_attempts
       WHERE student_id = $1 AND subtopic_id = $2
       ORDER BY attempt_number DESC
       LIMIT 1`,
      [studentId, subtopicId]
    );

    // Compute previous and next subtopic IDs in course sequence
    const allCourseSubtopics = await db.query(
      `SELECT cs.id
       FROM course_subtopics cs
       JOIN course_topics ct ON ct.id = cs.topic_id
       WHERE ct.course_id = $1
       ORDER BY ct.sort_order ASC, cs.sort_order ASC, cs.created_at ASC`,
      [courseId]
    );

    const subtopicList = allCourseSubtopics.rows.map((r: any) => r.id);
    const currentIndex = subtopicList.indexOf(subtopicId);
    const prevSubtopicId = currentIndex > 0 ? subtopicList[currentIndex - 1] : null;
    const nextSubtopicId =
      currentIndex >= 0 && currentIndex < subtopicList.length - 1
        ? subtopicList[currentIndex + 1]
        : null;

    res.json({
      success: true,
      data: {
        subtopic: {
          id: subtopic.id,
          title: subtopic.title,
          sortOrder: subtopic.sort_order,
          topicId: subtopic.topic_id,
          topicTitle: subtopic.topic_title,
          courseId: subtopic.course_id,
          isCompleted: Boolean(subtopic.is_completed),
          completedAt: subtopic.completed_at,
        },
        videos,
        codingProblems,
        mcqs,
        latestMcqAttempt: latestAttemptRes.rowCount > 0 ? latestAttemptRes.rows[0] : null,
        navigation: {
          prevSubtopicId,
          nextSubtopicId,
          currentIndex: currentIndex + 1,
          totalSubtopics: subtopicList.length,
        },
      },
    });
  } catch (err: any) {
    console.error('[getSubtopicContent Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 14: Track Video Watch Progress
 */
export async function trackVideoProgress(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const videoId = req.params.videoId as string;

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const schema = z.object({
      watchSeconds: z.number().min(0),
      lastPositionSeconds: z.number().min(0),
      durationSeconds: z.number().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
      return;
    }

    const { watchSeconds, lastPositionSeconds, durationSeconds } = parsed.data;

    // Verify video exists
    const videoRes = await db.query(
      `SELECT v.id, v.duration_seconds, v.subtopic_id
       FROM videos v WHERE v.id = $1`,
      [videoId]
    );

    if (videoRes.rowCount === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Video not found' });
      return;
    }

    const totalDuration = durationSeconds || videoRes.rows[0].duration_seconds || 1;
    const isCompleted = totalDuration > 0 && watchSeconds / totalDuration >= 0.9;

    // Upsert video progress
    const result = await db.query(
      `INSERT INTO video_progress (
         student_id, video_id, watch_seconds, last_position_seconds, is_completed, last_watched_at
       )
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (student_id, video_id)
       DO UPDATE SET
         watch_seconds = GREATEST(video_progress.watch_seconds, EXCLUDED.watch_seconds),
         last_position_seconds = EXCLUDED.last_position_seconds,
         is_completed = (CASE WHEN video_progress.is_completed THEN TRUE WHEN EXCLUDED.is_completed THEN TRUE ELSE FALSE END),
         last_watched_at = NOW()
       RETURNING *`,
      [studentId, videoId, Math.round(watchSeconds), Math.round(lastPositionSeconds), isCompleted]
    );

    res.json({
      success: true,
      data: {
        videoId,
        watchSeconds: result.rows[0].watch_seconds,
        lastPositionSeconds: result.rows[0].last_position_seconds,
        isCompleted: result.rows[0].is_completed,
      },
    });
  } catch (err: any) {
    console.error('[trackVideoProgress Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 14 & 15: Mark Subtopic Complete / Incomplete
 */
export async function toggleSubtopicCompletion(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const subtopicId = req.params.subtopicId as string;
    const isCompleted = req.body.isCompleted !== false; // defaults to true

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const courseId = await getCourseIdFromSubtopic(subtopicId);
    if (!courseId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Subtopic not found' });
      return;
    }

    const isEnrolled = await verifyEnrollment(studentId, courseId);
    if (!isEnrolled) {
      res.status(403).json({ error: 'COURSE_NOT_ENROLLED', message: 'Not enrolled in course' });
      return;
    }

    const result = await db.query(
      `INSERT INTO student_progress (
         student_id, subtopic_id, is_completed, completed_at, last_accessed_at
       )
       VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (student_id, subtopic_id)
       DO UPDATE SET
         is_completed = $3,
         completed_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
         last_accessed_at = NOW()
       RETURNING *`,
      [studentId, subtopicId, isCompleted]
    );

    // Compute new course progress percentage
    const statsRes = await db.query(
      `SELECT 
         COUNT(*) AS total_subtopics,
         COUNT(CASE WHEN sp.is_completed = TRUE THEN 1 END) AS completed_subtopics
       FROM course_subtopics cs
       JOIN course_topics ct ON ct.id = cs.topic_id
       LEFT JOIN student_progress sp ON sp.subtopic_id = cs.id AND sp.student_id = $2
       WHERE ct.course_id = $1`,
      [courseId, studentId]
    );

    const total = parseInt(statsRes.rows[0].total_subtopics, 10) || 0;
    const completed = parseInt(statsRes.rows[0].completed_subtopics, 10) || 0;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        subtopicId,
        isCompleted: result.rows[0].is_completed,
        completedAt: result.rows[0].completed_at,
        progressPercentage,
      },
    });
  } catch (err: any) {
    console.error('[toggleSubtopicCompletion Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 16 & 31: Run Code (Testing in Sandbox)
 */
export async function runStudentCode(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const problemId = req.params.problemId as string;

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const schema = z.object({
      code: z.string().min(1, 'Code cannot be empty'),
      language: z.string().min(1, 'Language is required'),
      customInput: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
      return;
    }

    const { code, language, customInput } = parsed.data;

    // Fetch problem
    const problemRes = await db.query(
      `SELECT id, subtopic_id, time_limit_ms FROM coding_problems WHERE id = $1`,
      [problemId]
    );

    if (problemRes.rowCount === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Problem not found' });
      return;
    }

    const problem = problemRes.rows[0];
    const courseId = await getCourseIdFromSubtopic(problem.subtopic_id);
    if (courseId) {
      const isEnrolled = await verifyEnrollment(studentId, courseId);
      if (!isEnrolled) {
        res.status(403).json({ error: 'COURSE_NOT_ENROLLED', message: 'Not enrolled in course' });
        return;
      }
    }

    // If customInput is provided, run single test
    if (typeof customInput === 'string') {
      const execResult = await runCode(language, code, customInput, problem.time_limit_ms);
      res.json({
        success: true,
        data: {
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          executionTimeMs: execResult.executionTimeMs,
          timedOut: execResult.timedOut || false,
          error: execResult.error,
        },
      });
      return;
    }

    // Otherwise evaluate against public test cases
    const testCasesRes = await db.query(
      `SELECT input_data, expected_output, is_hidden
       FROM coding_test_cases
       WHERE problem_id = $1 AND is_hidden = FALSE
       ORDER BY sort_order ASC`,
      [problemId]
    );

    const testCases = testCasesRes.rows.map((tc: any) => ({
      input: tc.input_data,
      expectedOutput: tc.expected_output,
      isHidden: false,
    }));

    const evalResult = await evaluateCodeWithTestCases(
      language,
      code,
      testCases,
      problem.time_limit_ms
    );

    res.json({
      success: true,
      data: evalResult,
    });
  } catch (err: any) {
    console.error('[runStudentCode Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 16 & 31: Submit Code Solution (Evaluates against ALL test cases including hidden)
 */
export async function submitStudentCode(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const problemId = req.params.problemId as string;

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const schema = z.object({
      code: z.string().min(1, 'Code cannot be empty'),
      language: z.string().min(1, 'Language is required'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
      return;
    }

    const { code, language } = parsed.data;

    // Fetch problem
    const problemRes = await db.query(
      `SELECT id, subtopic_id, time_limit_ms FROM coding_problems WHERE id = $1`,
      [problemId]
    );

    if (problemRes.rowCount === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Problem not found' });
      return;
    }

    const problem = problemRes.rows[0];
    const courseId = await getCourseIdFromSubtopic(problem.subtopic_id);
    if (courseId) {
      const isEnrolled = await verifyEnrollment(studentId, courseId);
      if (!isEnrolled) {
        res.status(403).json({ error: 'COURSE_NOT_ENROLLED', message: 'Not enrolled in course' });
        return;
      }
    }

    // Fetch ALL test cases (both public and hidden)
    const testCasesRes = await db.query(
      `SELECT input_data, expected_output, is_hidden
       FROM coding_test_cases
       WHERE problem_id = $1
       ORDER BY sort_order ASC`,
      [problemId]
    );

    const testCases = testCasesRes.rows.map((tc: any) => ({
      input: tc.input_data,
      expectedOutput: tc.expected_output,
      isHidden: tc.is_hidden,
    }));

    // Evaluate
    const evalResult = await evaluateCodeWithTestCases(
      language,
      code,
      testCases,
      problem.time_limit_ms
    );

    // Save to coding_submissions
    const subRes = await db.query(
      `INSERT INTO coding_submissions (
         student_id, problem_id, code, language, status,
         test_cases_passed, total_test_cases, execution_time_ms, score
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, submitted_at`,
      [
        studentId,
        problemId,
        code,
        language,
        evalResult.status,
        evalResult.testCasesPassed,
        evalResult.totalTestCases,
        evalResult.executionTimeMs,
        evalResult.score,
      ]
    );

    // Filter hidden test case expected/actual output to protect test suite integrity
    const sanitizedResults = evalResult.results.map((r) => {
      if (r.isHidden) {
        return {
          testCaseIndex: r.testCaseIndex,
          input: '[Hidden Test Case]',
          expectedOutput: '[Hidden]',
          actualOutput: r.passed ? '[Passed]' : '[Failed]',
          passed: r.passed,
          isHidden: true,
          executionTimeMs: r.executionTimeMs,
        };
      }
      return r;
    });

    res.json({
      success: true,
      data: {
        submissionId: subRes.rows[0].id,
        submittedAt: subRes.rows[0].submitted_at,
        status: evalResult.status,
        score: evalResult.score,
        testCasesPassed: evalResult.testCasesPassed,
        totalTestCases: evalResult.totalTestCases,
        executionTimeMs: evalResult.executionTimeMs,
        results: sanitizedResults,
      },
    });
  } catch (err: any) {
    console.error('[submitStudentCode Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 17: Submit MCQ Quiz Attempt
 */
export async function submitMcqAttempt(req: Request, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    const subtopicId = req.params.subtopicId as string;

    if (!studentId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const courseId = await getCourseIdFromSubtopic(subtopicId);
    if (!courseId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Subtopic not found' });
      return;
    }

    const isEnrolled = await verifyEnrollment(studentId, courseId);
    if (!isEnrolled) {
      res.status(403).json({ error: 'COURSE_NOT_ENROLLED', message: 'Not enrolled in course' });
      return;
    }

    const schema = z.object({
      answers: z.array(
        z.object({
          questionId: z.string().uuid(),
          selectedOptionId: z.string().uuid(),
        })
      ),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
      return;
    }

    const { answers } = parsed.data;

    // Fetch all questions for this subtopic with correct options and explanations
    const questionsRes = await db.query(
      `SELECT mq.id, mq.question_text, mq.explanation, mq.points,
              mo.id AS correct_option_id
       FROM mcq_questions mq
       LEFT JOIN mcq_options mo ON mo.question_id = mq.id AND mo.is_correct = TRUE
       WHERE mq.subtopic_id = $1`,
      [subtopicId]
    );

    if (questionsRes.rowCount === 0) {
      res.status(400).json({ error: 'NO_QUESTIONS', message: 'No questions in this quiz' });
      return;
    }

    const questionsMap = new Map<string, any>();
    for (const q of questionsRes.rows) {
      questionsMap.set(q.id, q);
    }

    let totalScore = 0;
    let earnedScore = 0;
    const answersReview = [];

    for (const q of questionsRes.rows) {
      totalScore += q.points || 1;
      const userAns = answers.find((a) => a.questionId === q.id);
      const isCorrect = userAns ? userAns.selectedOptionId === q.correct_option_id : false;

      if (isCorrect) {
        earnedScore += q.points || 1;
      }

      answersReview.push({
        questionId: q.id,
        questionText: q.question_text,
        selectedOptionId: userAns ? userAns.selectedOptionId : null,
        correctOptionId: q.correct_option_id,
        isCorrect,
        explanation: q.explanation,
      });
    }

    const totalQuestions = questionsRes.rows.length;
    const percentage = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;
    const passed = percentage >= 60; // Standard 60% passing threshold

    // Determine next attempt number
    const countRes = await db.query(
      `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt
       FROM mcq_attempts
       WHERE student_id = $1 AND subtopic_id = $2`,
      [studentId, subtopicId]
    );
    const nextAttempt = parseInt(countRes.rows[0].next_attempt, 10) || 1;

    // Insert attempt
    const attemptRes = await db.query(
      `INSERT INTO mcq_attempts (
         student_id, subtopic_id, score, total_questions, percentage, passed, attempt_number
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [studentId, subtopicId, earnedScore, totalQuestions, percentage, passed, nextAttempt]
    );

    const attemptId = attemptRes.rows[0].id;

    // Insert answers
    for (const ans of answersReview) {
      await db.query(
        `INSERT INTO mcq_attempt_answers (
           attempt_id, question_id, selected_option_id, is_correct
         )
         VALUES ($1, $2, $3, $4)`,
        [attemptId, ans.questionId, ans.selectedOptionId, ans.isCorrect]
      );
    }

    res.json({
      success: true,
      data: {
        attemptId,
        score: earnedScore,
        totalQuestions,
        percentage,
        passed,
        attemptNumber: nextAttempt,
        submittedAt: attemptRes.rows[0].created_at,
        review: answersReview,
      },
    });
  } catch (err: any) {
    console.error('[submitMcqAttempt Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * Section 30: Video Stream / URL Delivery Route
 * Validates HMAC-SHA256 token and returns video resource or placeholder
 */
export async function streamCourseVideo(req: Request, res: Response): Promise<void> {
  try {
    const videoId = req.params.videoId as string;
    const token = req.query.token as string;

    if (!token) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Missing video access token' });
      return;
    }

    const payload = verifySignedVideoToken(token);
    if (!payload || payload.videoId !== videoId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid or expired video access token' });
      return;
    }

    // Video token is authentic and non-expired.
    // In production, this redirects to a pre-signed S3/Cloudflare R2 stream URL, or streams the file.
    // For local dev/testing, send JSON with verified stream metadata or redirect.
    res.json({
      success: true,
      videoId: payload.videoId,
      storageKey: payload.storageKey,
      expiresAt: payload.expiresAt,
      // Sample stream URL (HLS or MP4)
      streamUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
      message: 'Video access authorized.',
    });
  } catch (err: any) {
    console.error('[streamCourseVideo Error]', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
}
