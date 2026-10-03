import { Router } from 'express';
import { MentorController } from '../controllers/mentor.controller';
import { authenticateToken, requireActive, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect all mentor routes with authentication, active check, and MENTOR role
router.use(authenticateToken);
router.use(requireActive);
router.use(requireRole(['MENTOR']));

// Dashboard overview & KPIs
router.get('/dashboard', MentorController.getDashboard);

// Assigned students list
router.get('/students', MentorController.getAssignedStudents);

// Student detail audit (overall progress, each live class attended/absent, login days history, coding, mcq, notes)
router.get('/students/:studentId', MentorController.getStudentDetails);

// Add mentor feedback / guidance note
router.post('/students/:studentId/notes', MentorController.addStudentNote);

// Delete mentor note
router.delete('/notes/:noteId', MentorController.deleteStudentNote);

export default router;
