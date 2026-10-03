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

      if (!fullName || !email || !password || !phone) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Full name, email, phone, and password are required.',
        });
        return;
      }

      let normalizedPhone = phone.trim();
      if (!normalizedPhone.startsWith('+') && /^\d{10}$/.test(normalizedPhone)) {
        normalizedPhone = `+91${normalizedPhone}`;
      }

      // Check existing email or phone
      const existingUser = await db.query(
        `SELECT id FROM users WHERE email = $1 OR phone = $2`,
        [email.trim().toLowerCase(), normalizedPhone]
      );

      if (existingUser.rowCount && existingUser.rowCount > 0) {
        res.status(409).json({
          success: false,
          code: 'USER_EXISTS',
          message: 'A user with this email or phone number already exists.',
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
        [normalizedPhone, email.trim().toLowerCase(), passwordHash]
      );
      const mentorUserId = userInsertRes.rows[0].id;

      await db.query(
        `INSERT INTO mentor_profiles (user_id, full_name, specialization, bio, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [mentorUserId, fullName.trim(), specialization?.trim() || null, bio?.trim() || null, normalizedPhone]
      );

      await db.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Mentor created successfully.',
        data: {
          id: mentorUserId,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: normalizedPhone,
          role: 'MENTOR',
          specialization: specialization?.trim() || null,
        },
      });
    } catch (err) {
      await db.query('ROLLBACK').catch(() => {});
      next(err);
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
