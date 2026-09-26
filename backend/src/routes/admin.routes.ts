import { Router } from 'express';
import { AdminStudentsController } from '../controllers/admin.students.controller';
import { AdminCourseController } from '../controllers/admin.course.controller';
import { AdminPaymentController } from '../controllers/admin.payment.controller';
import { LiveClassController } from '../controllers/liveClass.controller';
import { authenticateToken, requireActive, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect all admin routes with authentication, active check, and ADMIN role
router.use(authenticateToken);
router.use(requireActive);
router.use(requireRole(['ADMIN']));

// Summary stats
router.get('/summary', AdminStudentsController.getAdminSummary);

// Section 5: Pending Students approval routes
router.get('/students/pending', AdminStudentsController.getPendingStudents);
router.patch('/students/:id/approve', AdminStudentsController.approveStudent);
router.patch('/students/:id/reject', AdminStudentsController.rejectStudent);
router.patch('/students/:id/suspend', AdminStudentsController.suspendStudent);
router.patch('/students/:id/reactivate', AdminStudentsController.reactivateStudent);

// Section 26: All Students directory
router.get('/students', AdminStudentsController.getAllStudents);

// =============================================================================
// Section 27: Admin Course & Learning Content Management
// =============================================================================

// Courses
router.get('/courses', AdminCourseController.listCourses);
router.post('/courses', AdminCourseController.createCourse);
router.get('/courses/:id', AdminCourseController.getCourseDetails);
router.put('/courses/:id', AdminCourseController.updateCourse);
router.delete('/courses/:id', AdminCourseController.deleteCourse);
router.patch('/courses/:id/publish', AdminCourseController.togglePublish);

// Topics
router.post('/courses/:courseId/topics', AdminCourseController.createTopic);
router.put('/topics/:id', AdminCourseController.updateTopic);
router.delete('/topics/:id', AdminCourseController.deleteTopic);

// Subtopics
router.post('/topics/:topicId/subtopics', AdminCourseController.createSubtopic);
router.put('/subtopics/:id', AdminCourseController.updateSubtopic);
router.delete('/subtopics/:id', AdminCourseController.deleteSubtopic);

// Learning Content: Videos
router.post('/subtopics/:subtopicId/videos', AdminCourseController.createVideo);
router.delete('/videos/:id', AdminCourseController.deleteVideo);

// Learning Content: Coding Problems
router.post('/subtopics/:subtopicId/coding', AdminCourseController.createCodingProblem);
router.delete('/coding/:id', AdminCourseController.deleteCodingProblem);

// Learning Content: MCQs
router.post('/subtopics/:subtopicId/mcqs', AdminCourseController.createMcqQuestion);
router.delete('/mcqs/:id', AdminCourseController.deleteMcqQuestion);

// Section 11 & 35: Payment Management & Manual QR Verification
router.get('/payments', AdminPaymentController.listPayments);
router.post('/payments/:id/verify-qr', AdminPaymentController.verifyQrPayment);
router.post('/payments/:id/reject', AdminPaymentController.rejectPayment);

// Section 28: Live Classes & Recordings Management
router.get('/live-classes', LiveClassController.listAdminLiveClasses);
router.post('/live-classes', LiveClassController.createLiveClass);
router.patch('/live-classes/:id', LiveClassController.updateLiveClass);
router.delete('/live-classes/:id', LiveClassController.deleteLiveClass);
router.post('/live-classes/:id/recordings', LiveClassController.addRecording);
router.delete('/recordings/:id', LiveClassController.deleteRecording);

export default router;
