import { Router } from 'express';
import { AdminStudentsController } from '../controllers/admin.students.controller';
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

export default router;
