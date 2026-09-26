import { Router } from 'express';
import { StudentDashboardController } from '../controllers/student.dashboard.controller';
import { LiveClassController } from '../controllers/liveClass.controller';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken, requireActive, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public FAQs endpoint (accessible to anyone or students)
router.get('/faqs', StudentDashboardController.getFaqs);

// Protected student routes: requires valid token, ACTIVE status, and STUDENT role
router.use(authenticateToken);
router.use(requireActive);
router.use(requireRole(['STUDENT']));

// Section 7: Home dashboard overview
router.get('/dashboard', StudentDashboardController.getDashboardSummary);

// Section 8: My Courses
router.get('/courses', StudentDashboardController.getMyCourses);

// Section 9: Browse Courses Catalog
router.get('/catalog', StudentDashboardController.getCourseCatalog);

// Section 23: Student Profile
router.get('/profile', StudentDashboardController.getProfile);
router.put('/profile', StudentDashboardController.updateProfile);

// Section 18: Live Classes & Recordings
router.get('/live-classes', LiveClassController.getStudentLiveClasses);

// Section 19: Notifications Center
router.get('/notifications', NotificationController.getStudentNotifications);
router.get('/notifications/unread-count', NotificationController.getUnreadCount);
router.patch('/notifications/mark-all-read', NotificationController.markAllAsRead);
router.patch('/notifications/:id/read', NotificationController.markAsRead);

export default router;
