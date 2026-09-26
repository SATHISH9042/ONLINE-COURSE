import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';

export class AdminStudentsController {
  /**
   * Section 5: List all students waiting for approval (PENDING_APPROVAL)
   */
  static async getPendingStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const offset = (page - 1) * limit;

      const countRes = await db.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT' AND status = 'PENDING_APPROVAL' AND deleted_at IS NULL"
      );
      const total = parseInt(countRes.rows[0].count, 10);

      const studentsRes = await db.query(
        `SELECT u.id, u.phone, u.email, u.status, u.created_at as registration_date,
                sp.full_name as student_name, sp.city, sp.state
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.role = 'STUDENT' AND u.status = 'PENDING_APPROVAL' AND u.deleted_at IS NULL
         ORDER BY u.created_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      res.status(200).json({
        success: true,
        data: studentsRes.rows,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 5: Approve student (PENDING_APPROVAL -> ACTIVE)
   */
  static async approveStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const userRes = await db.query(
        "SELECT id, phone, email, status FROM users WHERE id = $1 AND role = 'STUDENT' AND deleted_at IS NULL",
        [id]
      );

      if (userRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'STUDENT_NOT_FOUND',
          message: 'Student account not found.',
        });
        return;
      }

      const currentStatus = userRes.rows[0].status;

      // Update student status to ACTIVE
      await db.transaction(async (tx) => {
        await tx.query(
          "UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1",
          [id]
        );

        // Record immutable audit log (Section 33)
        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, 'STUDENT_APPROVED', 'users', $2, $3, $4, $5, $6)`,
          [
            adminId,
            id,
            JSON.stringify({ status: currentStatus }),
            JSON.stringify({ status: 'ACTIVE' }),
            req.ip || '127.0.0.1',
            req.headers['user-agent'] || 'AdminConsole',
          ]
        );

        // Create welcome notification for student
        const notifRes = await tx.query(
          `INSERT INTO notifications (title, message, type, target_type, target_audience, created_by_admin_id)
           VALUES ('Account Approved!', 'Welcome to the institute! Your account has been reviewed and approved. You may now explore courses and start learning.', 'SYSTEM', 'GENERAL', 'SPECIFIC', $1)
           RETURNING id`,
          [adminId]
        );

        await tx.query(
          `INSERT INTO notification_recipients (notification_id, student_id)
           VALUES ($1, $2)`,
          [notifRes.rows[0].id, id]
        );
      });

      res.status(200).json({
        success: true,
        message: 'Student account has been approved and activated.',
        data: {
          id,
          status: 'ACTIVE',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 5: Reject student (PENDING_APPROVAL -> REJECTED)
   */
  static async rejectStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;

      const userRes = await db.query(
        "SELECT id, status FROM users WHERE id = $1 AND role = 'STUDENT' AND deleted_at IS NULL",
        [id]
      );

      if (userRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'STUDENT_NOT_FOUND',
          message: 'Student account not found.',
        });
        return;
      }

      const currentStatus = userRes.rows[0].status;

      await db.transaction(async (tx) => {
        await tx.query(
          "UPDATE users SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
          [id]
        );

        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, 'STUDENT_REJECTED', 'users', $2, $3, $4, $5, $6)`,
          [
            adminId,
            id,
            JSON.stringify({ status: currentStatus }),
            JSON.stringify({ status: 'REJECTED', reason: reason || 'Not specified' }),
            req.ip || '127.0.0.1',
            req.headers['user-agent'] || 'AdminConsole',
          ]
        );
      });

      res.status(200).json({
        success: true,
        message: 'Student account has been rejected.',
        data: {
          id,
          status: 'REJECTED',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 5 & 26: Suspend student (ACTIVE -> SUSPENDED)
   * Also increments token_version to invalidate all active sessions immediately
   */
  static async suspendStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;

      const userRes = await db.query(
        "SELECT id, status, token_version FROM users WHERE id = $1 AND role = 'STUDENT' AND deleted_at IS NULL",
        [id]
      );

      if (userRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'STUDENT_NOT_FOUND',
          message: 'Student account not found.',
        });
        return;
      }

      const currentStatus = userRes.rows[0].status;
      const newVersion = (userRes.rows[0].token_version || 1) + 1;

      await db.transaction(async (tx) => {
        await tx.query(
          "UPDATE users SET status = 'SUSPENDED', token_version = $1, updated_at = NOW() WHERE id = $2",
          [newVersion, id]
        );

        // Revoke all refresh tokens
        await tx.query(
          'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
          [id]
        );

        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, 'STUDENT_SUSPENDED', 'users', $2, $3, $4, $5, $6)`,
          [
            adminId,
            id,
            JSON.stringify({ status: currentStatus }),
            JSON.stringify({ status: 'SUSPENDED', reason: reason || 'Suspended by admin' }),
            req.ip || '127.0.0.1',
            req.headers['user-agent'] || 'AdminConsole',
          ]
        );
      });

      res.status(200).json({
        success: true,
        message: 'Student account has been suspended and all sessions revoked.',
        data: {
          id,
          status: 'SUSPENDED',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 26: Reactivate student (SUSPENDED / REJECTED -> ACTIVE)
   */
  static async reactivateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const userRes = await db.query(
        "SELECT id, status FROM users WHERE id = $1 AND role = 'STUDENT' AND deleted_at IS NULL",
        [id]
      );

      if (userRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'STUDENT_NOT_FOUND',
          message: 'Student account not found.',
        });
        return;
      }

      const currentStatus = userRes.rows[0].status;

      await db.transaction(async (tx) => {
        await tx.query(
          "UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1",
          [id]
        );

        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, 'STUDENT_REACTIVATED', 'users', $2, $3, $4, $5, $6)`,
          [
            adminId,
            id,
            JSON.stringify({ status: currentStatus }),
            JSON.stringify({ status: 'ACTIVE' }),
            req.ip || '127.0.0.1',
            req.headers['user-agent'] || 'AdminConsole',
          ]
        );
      });

      res.status(200).json({
        success: true,
        message: 'Student account reactivated to ACTIVE status.',
        data: {
          id,
          status: 'ACTIVE',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 26: View all students with search and filter
   */
  static async getAllStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const status = req.query.status as string;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      let whereConditions = ["u.role = 'STUDENT'", 'u.deleted_at IS NULL'];
      let queryParams: any[] = [];
      let paramIdx = 1;

      if (status && ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'].includes(status)) {
        whereConditions.push(`u.status = $${paramIdx}`);
        queryParams.push(status);
        paramIdx++;
      }

      if (search) {
        whereConditions.push(
          `(sp.full_name ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`
        );
        queryParams.push(`%${search}%`);
        paramIdx++;
      }

      const whereClause = whereConditions.join(' AND ');

      const countRes = await db.query(
        `SELECT COUNT(*) as count
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE ${whereClause}`,
        queryParams
      );
      const total = parseInt(countRes.rows[0].count, 10);

      const studentsRes = await db.query(
        `SELECT u.id, u.phone, u.email, u.status, u.created_at as registration_date,
                sp.full_name as student_name, sp.city, sp.state,
                (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.student_id = u.id AND ce.status = 'ACTIVE') as enrolled_courses_count
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...queryParams, limit, offset]
      );

      res.status(200).json({
        success: true,
        data: studentsRes.rows,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 25: Quick platform overview statistics for admin
   */
  static async getAdminSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND deleted_at IS NULL) as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND status = 'ACTIVE' AND deleted_at IS NULL) as active_students,
          (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND status = 'PENDING_APPROVAL' AND deleted_at IS NULL) as pending_students,
          (SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL) as total_courses,
          (SELECT COUNT(*) FROM course_enrollments WHERE status = 'ACTIVE') as total_enrollments,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS' OR status = 'MANUALLY_VERIFIED') as total_payments_revenue
      `);

      res.status(200).json({
        success: true,
        data: stats.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
}
