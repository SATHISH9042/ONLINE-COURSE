import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { z } from 'zod';

export class NotificationController {
  // ---------------------------------------------------------------------------
  // 1. STUDENT NOTIFICATION ENDPOINTS (Section 19)
  // ---------------------------------------------------------------------------

  /**
   * Section 19: Get student notifications list
   */
  static async getStudentNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const unreadOnly = req.query.unreadOnly === 'true';

      let sql = `
        SELECT nr.id as recipient_id, nr.is_read, nr.read_at,
               n.id as notification_id, n.title, n.message, n.type,
               n.target_type, n.target_id, n.target_course_id, n.created_at,
               c.title as course_title
        FROM notification_recipients nr
        JOIN notifications n ON n.id = nr.notification_id
        LEFT JOIN courses c ON c.id = n.target_course_id
        WHERE nr.student_id = $1
      `;

      if (unreadOnly) {
        sql += ` AND nr.is_read = FALSE`;
      }

      sql += ` ORDER BY n.created_at DESC LIMIT 100`;

      const notifsRes = await db.query(sql, [studentId]);

      // Unread count
      const countRes = await db.query(
        `SELECT COUNT(*) as unread_count FROM notification_recipients WHERE student_id = $1 AND is_read = FALSE`,
        [studentId]
      );
      const unreadCount = parseInt(countRes.rows[0].unread_count, 10) || 0;

      res.status(200).json({
        success: true,
        data: {
          notifications: notifsRes.rows.map((row) => ({
            id: row.notification_id,
            recipientId: row.recipient_id,
            title: row.title,
            message: row.message,
            type: row.type,
            targetType: row.target_type,
            targetId: row.target_id,
            targetCourseId: row.target_course_id,
            courseTitle: row.course_title,
            isRead: row.is_read,
            readAt: row.read_at,
            createdAt: row.created_at,
          })),
          unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 19: Get quick unread notifications count
   */
  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const countRes = await db.query(
        `SELECT COUNT(*) as unread_count FROM notification_recipients WHERE student_id = $1 AND is_read = FALSE`,
        [studentId]
      );
      const unreadCount = parseInt(countRes.rows[0].unread_count, 10) || 0;

      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 19: Mark single notification as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const { id } = req.params; // notification_id or recipient_id

      const updateRes = await db.query(
        `UPDATE notification_recipients
         SET is_read = TRUE, read_at = NOW()
         WHERE student_id = $1 AND (notification_id = $2 OR id = $2)
         RETURNING *`,
        [studentId, id]
      );

      if (updateRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: 'Notification not found for this student.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 19: Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;

      const updateRes = await db.query(
        `UPDATE notification_recipients
         SET is_read = TRUE, read_at = NOW()
         WHERE student_id = $1 AND is_read = FALSE
         RETURNING id`,
        [studentId]
      );

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read.',
        updatedCount: updateRes.rowCount,
      });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. ADMIN BROADCAST ENDPOINTS (Section 29)
  // ---------------------------------------------------------------------------

  /**
   * Section 29: List past broadcast notifications sent by admin
   */
  static async listAdminNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifsRes = await db.query(
        `SELECT n.id, n.title, n.message, n.type, n.target_audience,
                n.target_type, n.target_id, n.target_course_id, n.created_at,
                c.title as course_title,
                u.email as admin_email,
                (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id) as recipients_count,
                (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.is_read = TRUE) as read_count
         FROM notifications n
         LEFT JOIN courses c ON c.id = n.target_course_id
         LEFT JOIN users u ON u.id = n.created_by_admin_id
         ORDER BY n.created_at DESC`
      );

      res.status(200).json({
        success: true,
        data: notifsRes.rows.map((row) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          type: row.type,
          targetAudience: row.target_audience,
          targetType: row.target_type,
          targetId: row.target_id,
          targetCourseId: row.target_course_id,
          courseTitle: row.course_title,
          adminEmail: row.admin_email,
          createdAt: row.created_at,
          recipientsCount: parseInt(row.recipients_count, 10) || 0,
          readCount: parseInt(row.read_count, 10) || 0,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 29: Send new broadcast notification to targeted audience
   */
  static async sendBroadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;

      const schema = z.object({
        title: z.string().trim().min(3, 'Notification title must be at least 3 characters'),
        message: z.string().trim().min(5, 'Message body must be at least 5 characters'),
        type: z.enum(['ANNOUNCEMENT', 'LIVE_CLASS', 'COURSE', 'COURSE_UPDATE', 'PAYMENT', 'SYSTEM']).default('ANNOUNCEMENT'),
        targetAudience: z.enum(['ALL', 'COURSE', 'STUDENT', 'SPECIFIC']).default('ALL'),
        targetCourseId: z.string().uuid().optional().nullable(),
        targetStudentId: z.string().uuid().optional().nullable(),
        targetType: z.string().optional().nullable(),
        targetId: z.string().optional().nullable(),
      });

      const data = schema.parse(req.body);

      // Validate targetCourseId if audience is COURSE
      if (data.targetAudience === 'COURSE' && !data.targetCourseId) {
        res.status(400).json({
          success: false,
          code: 'MISSING_COURSE_ID',
          message: 'Target course must be specified when target audience is COURSE.',
        });
        return;
      }

      // Validate targetStudentId if audience is STUDENT or SPECIFIC
      const isSpecificStudent = data.targetAudience === 'STUDENT' || data.targetAudience === 'SPECIFIC';
      if (isSpecificStudent && !data.targetStudentId) {
        res.status(400).json({
          success: false,
          code: 'MISSING_STUDENT_ID',
          message: 'Target student must be specified when target audience is STUDENT.',
        });
        return;
      }

      // Database enum mappings
      const dbAudience = isSpecificStudent ? 'SPECIFIC' : data.targetAudience;
      const dbType = data.type === 'COURSE_UPDATE' ? 'COURSE' : data.type;

      // 1. Create notification record
      const notifRes = await db.query(
        `INSERT INTO notifications (
           title, message, type, target_audience, target_course_id,
           target_type, target_id, created_by_admin_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.title,
          data.message,
          dbType,
          dbAudience,
          data.targetCourseId || null,
          data.targetType || (data.targetCourseId ? 'COURSE' : 'ANNOUNCEMENT'),
          data.targetId || data.targetCourseId || null,
          adminId,
        ]
      );

      const notification = notifRes.rows[0];

      // 2. Resolve recipient student IDs
      let recipientStudentIds: string[] = [];

      if (dbAudience === 'ALL') {
        const studentsRes = await db.query(
          `SELECT id FROM users WHERE role = 'STUDENT' AND status = 'ACTIVE'`
        );
        recipientStudentIds = studentsRes.rows.map((r) => r.id);
      } else if (dbAudience === 'COURSE' && data.targetCourseId) {
        const enrolledRes = await db.query(
          `SELECT DISTINCT student_id FROM course_enrollments WHERE course_id = $1 AND status = 'ACTIVE'`,
          [data.targetCourseId]
        );
        recipientStudentIds = enrolledRes.rows.map((r) => r.student_id);
      } else if (isSpecificStudent && data.targetStudentId) {
        recipientStudentIds = [data.targetStudentId];
      }

      // 3. Bulk insert recipients
      let insertedCount = 0;
      if (recipientStudentIds.length > 0) {
        for (const sid of recipientStudentIds) {
          await db.query(
            `INSERT INTO notification_recipients (notification_id, student_id, is_read)
             VALUES ($1, $2, FALSE)
             ON CONFLICT (notification_id, student_id) DO NOTHING`,
            [notification.id, sid]
          );
          insertedCount++;
        }
      }

      // 4. Record audit log
      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values)
         VALUES ($1, 'NOTIFICATION_BROADCAST_SENT', 'notifications', $2, $3)`,
        [
          adminId,
          notification.id,
          JSON.stringify({
            notificationId: notification.id,
            title: data.title,
            targetAudience: data.targetAudience,
            recipientsCount: insertedCount,
          }),
        ]
      );

      res.status(201).json({
        success: true,
        message: `Notification broadcast sent successfully to ${insertedCount} students.`,
        data: {
          ...notification,
          recipientsCount: insertedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 29: Admin delete broadcast notification
   */
  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const delRes = await db.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
      if (delRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Notification not found.' });
        return;
      }

      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values)
         VALUES ($1, 'NOTIFICATION_DELETED', 'notifications', $2, $3)`,
        [adminId, id, JSON.stringify(delRes.rows[0])]
      );

      res.status(200).json({
        success: true,
        message: 'Notification and recipient distributions deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
