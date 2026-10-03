import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { hashPassword } from '../utils/password';

export class AdminMentorController {
  /**
   * List all mentors with assigned student counts and profile info
   */
  static async listMentors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentorsRes = await db.query(
        `SELECT 
           u.id, u.email, u.phone, u.status, u.created_at,
           mp.full_name, mp.specialization, mp.bio, mp.avatar_url,
           COUNT(DISTINCT msa.student_id) as assigned_students_count
         FROM users u
         JOIN mentor_profiles mp ON mp.user_id = u.id
         LEFT JOIN mentor_student_assignments msa ON msa.mentor_id = u.id
         WHERE u.role = 'MENTOR' AND u.deleted_at IS NULL
         GROUP BY u.id, u.email, u.phone, u.status, u.created_at, mp.full_name, mp.specialization, mp.bio, mp.avatar_url
         ORDER BY mp.full_name ASC`
      );

      res.status(200).json({
        success: true,
        data: mentorsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new Mentor user account & profile
   */
  static async createMentor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, phone, password, specialization, bio } = req.body;

      if (!fullName || !fullName.trim()) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Full name is required.',
        });
        return;
      }

      if (!email || !email.trim()) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Email address is required.',
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Please provide a valid email address (e.g. mentor@institute.edu).',
        });
        return;
      }

      if (!phone || !phone.trim()) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Phone number is required.',
        });
        return;
      }

      if (!password || password.length < 6) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long.',
        });
        return;
      }

      // Robust phone normalization: strip all whitespace, hyphens, brackets
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
      let normalizedPhone = cleanPhone;
      if (!normalizedPhone.startsWith('+')) {
        if (/^\d{10}$/.test(normalizedPhone)) {
          normalizedPhone = `+91${normalizedPhone}`;
        } else {
          normalizedPhone = `+${normalizedPhone}`;
        }
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check existing email or phone
      const existingUser = await db.query(
        `SELECT id, email, phone FROM users 
         WHERE (LOWER(email) = LOWER($1) OR phone = $2 OR phone = $3)
           AND deleted_at IS NULL`,
        [cleanEmail, normalizedPhone, cleanPhone]
      );

      if (existingUser.rowCount && existingUser.rowCount > 0) {
        const found = existingUser.rows[0];
        const isEmailMatch = found.email && found.email.toLowerCase() === cleanEmail;
        res.status(409).json({
          success: false,
          code: 'USER_EXISTS',
          message: isEmailMatch
            ? `A user with email '${cleanEmail}' already exists. Please use a different email.`
            : `A user with phone number '${phone.trim()}' already exists. Please use a different phone number.`,
        });
        return;
      }

      const passwordHash = await hashPassword(password);

      // Create mentor in a transaction
      await db.query('BEGIN');

      const userInsertRes = await db.query(
        `INSERT INTO users (phone, email, password_hash, role, status)
         VALUES ($1, $2, $3, 'MENTOR', 'ACTIVE')
         RETURNING id`,
        [normalizedPhone, cleanEmail, passwordHash]
      );
      const mentorUserId = userInsertRes.rows[0].id;

      await db.query(
        `INSERT INTO mentor_profiles (user_id, full_name, specialization, bio, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [mentorUserId, fullName.trim(), specialization?.trim() || 'General Mentorship', bio?.trim() || null, normalizedPhone]
      );

      await db.query('COMMIT');

      res.status(201).json({
        success: true,
        message: `Mentor ${fullName.trim()} registered successfully.`,
        data: {
          id: mentorUserId,
          fullName: fullName.trim(),
          email: cleanEmail,
          phone: normalizedPhone,
          role: 'MENTOR',
          specialization: specialization?.trim() || 'General Mentorship',
        },
      });
    } catch (err: any) {
      await db.query('ROLLBACK').catch(() => {});
      console.error('[AdminMentorController.createMentor] Error:', err);
      res.status(500).json({
        success: false,
        code: 'CREATE_MENTOR_FAILED',
        message: err.message || 'Failed to create mentor account due to database error.',
      });
    }
  }

  /**
   * Assign one or multiple students to a mentor (Only Admin can perform this)
   */
  static async assignStudentsToMentor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { mentorId, studentIds, notes } = req.body;

      if (!mentorId || !Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'mentorId and a non-empty studentIds array are required.',
        });
        return;
      }

      // Check mentor exists
      const mentorRes = await db.query(
        `SELECT u.id, mp.full_name FROM users u 
         JOIN mentor_profiles mp ON mp.user_id = u.id 
         WHERE u.id = $1 AND u.role = 'MENTOR'`,
        [mentorId]
      );

      if (mentorRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'MENTOR_NOT_FOUND',
          message: 'Specified mentor not found.',
        });
        return;
      }

      const mentorName = mentorRes.rows[0].full_name;

      // Upsert assignments
      for (const studentId of studentIds) {
        await db.query(
          `INSERT INTO mentor_student_assignments (mentor_id, student_id, assigned_by_admin_id, notes, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (mentor_id, student_id)
           DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW(), assigned_by_admin_id = EXCLUDED.assigned_by_admin_id`,
          [mentorId, studentId, adminId, notes || null]
        );
      }

      res.status(200).json({
        success: true,
        message: `Successfully assigned ${studentIds.length} student(s) to mentor ${mentorName}.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove a student from a mentor's assignment
   */
  static async unassignStudentFromMentor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mentorId, studentId } = req.params;

      const deleteRes = await db.query(
        `DELETE FROM mentor_student_assignments WHERE mentor_id = $1 AND student_id = $2 RETURNING id`,
        [mentorId, studentId]
      );

      if (deleteRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'ASSIGNMENT_NOT_FOUND',
          message: 'Assignment not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Student unassigned from mentor successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all active students with their currently assigned mentors (for Admin Assignment Matrix)
   */
  static async getAllStudentsWithMentors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query.search as string || '').trim().toLowerCase();

      let query = `
        SELECT 
          u.id, u.email, u.phone, u.status, u.created_at,
          sp.full_name, sp.avatar_url, sp.city, sp.state,
          msa.mentor_id, msa.created_at as assigned_at, msa.notes as assignment_notes,
          mp.full_name as assigned_mentor_name,
          mp.specialization as assigned_mentor_specialization
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN mentor_student_assignments msa ON msa.student_id = u.id
        LEFT JOIN mentor_profiles mp ON mp.user_id = msa.mentor_id
        WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL
      `;

      const params: any[] = [];
      if (search) {
        query += ` AND (LOWER(sp.full_name) LIKE $1 OR LOWER(u.email) LIKE $1 OR u.phone LIKE $1)`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY sp.full_name ASC`;

      const studentsRes = await db.query(query, params);

      res.status(200).json({
        success: true,
        data: studentsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }
}
