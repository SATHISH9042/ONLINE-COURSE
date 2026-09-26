import { Router } from 'express';
import {
  getCourseCurriculum,
  getSubtopicContent,
  trackVideoProgress,
  toggleSubtopicCompletion,
  runStudentCode,
  submitStudentCode,
  submitMcqAttempt,
  streamCourseVideo,
} from '../controllers/student.learning.controller';
import { authenticateToken, requireActive, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public / Token-authenticated video streaming endpoint (Section 30)
// This verifies signed HMAC-SHA256 query tokens directly
router.get('/videos/:videoId/stream', streamCourseVideo);

// Protected routes: requires valid student token with ACTIVE status
router.use(authenticateToken);
router.use(requireActive);
router.use(requireRole(['STUDENT']));

// Section 12 & 13: Course Syllabus Hierarchy with completion checkmarks & last accessed lesson
router.get('/courses/:courseId/curriculum', getCourseCurriculum);

// Section 13, 14, 16, 17: Subtopic content (video token, coding problems, MCQs, prev/next)
router.get('/subtopics/:subtopicId', getSubtopicContent);

// Section 14: Track video watch duration and playback position
router.post('/videos/:videoId/progress', trackVideoProgress);

// Section 14 & 15: Mark subtopic complete / incomplete
router.post('/subtopics/:subtopicId/complete', toggleSubtopicCompletion);

// Section 16 & 31: Coding sandbox execution
router.post('/coding/:problemId/run', runStudentCode);
router.post('/coding/:problemId/submit', submitStudentCode);

// Section 17: MCQ Quiz submission & evaluation
router.post('/mcqs/:subtopicId/submit', submitMcqAttempt);

export default router;
