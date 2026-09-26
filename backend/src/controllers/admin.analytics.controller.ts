import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { config } from '../config';

export class AdminAnalyticsController {
  // ---------------------------------------------------------------------------
  // 1. MASTER DASHBOARD ANALYTICS (Section 25)
  // ---------------------------------------------------------------------------

  /**
   * Section 25: Master Dashboard Analytics Overview
   * Total students, pending approvals, active courses, total revenue,
   * today's sales, monthly enrollment trends, recent registrations & orders.
   */
  static async getAnalyticsOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. High-level metric counters
      const metricsRes = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND deleted_at IS NULL) as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND status = 'ACTIVE' AND deleted_at IS NULL) as active_students,
          (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND status = 'PENDING_APPROVAL' AND deleted_at IS NULL) as pending_students,
          (SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL AND is_published = TRUE) as active_courses,
          (SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL) as total_courses,
          (SELECT COUNT(*) FROM course_enrollments WHERE status = 'ACTIVE') as total_enrollments,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status IN ('SUCCESS', 'MANUALLY_VERIFIED')) as total_revenue,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status IN ('SUCCESS', 'MANUALLY_VERIFIED') AND created_at >= CURRENT_DATE) as today_sales,
          (SELECT COUNT(*) FROM live_classes WHERE status = 'LIVE') as active_live_classes,
          (SELECT COUNT(*) FROM live_classes WHERE status = 'UPCOMING') as upcoming_live_classes
      `);

      const m = metricsRes.rows[0];

      // 2. Recent Student Registrations (Latest 5)
      const recentStudentsRes = await db.query(`
        SELECT u.id, u.phone, u.email, u.status, u.created_at,
               sp.full_name as student_name, sp.city, sp.state
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC
        LIMIT 5
      `);

      // 3. Recent Course Purchases & Orders (Latest 5)
      const recentOrdersRes = await db.query(`
        SELECT p.id, p.order_id, p.amount, p.currency, p.status, p.payment_method,
               p.created_at, p.qr_reference_code,
               c.title as course_title,
               sp.full_name as student_name, u.phone as student_phone
        FROM payments p
        JOIN courses c ON c.id = p.course_id
        JOIN users u ON u.id = p.student_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 5
      `);

      // 4. Monthly Enrollment Trends (Last 6 Months)
      const monthlyEnrollmentsRes = await db.query(`
        SELECT TO_CHAR(enrolled_at, 'Mon YYYY') as month,
               DATE_TRUNC('month', enrolled_at) as month_date,
               COUNT(*) as enrollments_count
        FROM course_enrollments
        WHERE enrolled_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', enrolled_at), TO_CHAR(enrolled_at, 'Mon YYYY')
        ORDER BY month_date ASC
      `);

      // 5. System Health
      const uptimeSeconds = process.uptime();
      const memUsage = process.memoryUsage();

      const systemHealth = {
        status: 'OPERATIONAL',
        database: 'CONNECTED',
        nodeEnv: config.nodeEnv,
        uptimeSeconds: Math.floor(uptimeSeconds),
        uptimeFormatted: formatUptime(uptimeSeconds),
        memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
        memoryHeapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      };

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalStudents: parseInt(m.total_students, 10) || 0,
            activeStudents: parseInt(m.active_students, 10) || 0,
            pendingStudents: parseInt(m.pending_students, 10) || 0,
            activeCourses: parseInt(m.active_courses, 10) || 0,
            totalCourses: parseInt(m.total_courses, 10) || 0,
            totalEnrollments: parseInt(m.total_enrollments, 10) || 0,
            totalRevenue: parseFloat(m.total_revenue) || 0,
            todaySales: parseFloat(m.today_sales) || 0,
            activeLiveClasses: parseInt(m.active_live_classes, 10) || 0,
            upcomingLiveClasses: parseInt(m.upcoming_live_classes, 10) || 0,
          },
          recentStudents: recentStudentsRes.rows.map((r) => ({
            id: r.id,
            name: r.student_name || 'Anonymous Student',
            phone: r.phone,
            email: r.email,
            status: r.status,
            city: r.city,
            registeredAt: r.created_at,
          })),
          recentOrders: recentOrdersRes.rows.map((r) => ({
            id: r.id,
            orderId: r.order_id,
            amount: parseFloat(r.amount),
            currency: r.currency,
            status: r.status,
            paymentMethod: r.payment_method,
            qrReferenceCode: r.qr_reference_code,
            courseTitle: r.course_title,
            studentName: r.student_name || 'Anonymous Student',
            studentPhone: r.student_phone,
            createdAt: r.created_at,
          })),
          monthlyTrends: monthlyEnrollmentsRes.rows.map((r) => ({
            month: r.month,
            count: parseInt(r.enrollments_count, 10) || 0,
          })),
          systemHealth,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. STUDENT PROGRESS MONITORING (Section 32)
  // ---------------------------------------------------------------------------

  /**
   * Section 32: Detailed student progress breakdown
   */
  static async getStudentProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // student user id

      // 1. Student basic info
      const studentRes = await db.query(
        `SELECT u.id, u.phone, u.email, u.status, u.created_at as registered_at,
                sp.full_name as student_name, sp.bio, sp.city, sp.state
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.id = $1 AND u.role = 'STUDENT' AND u.deleted_at IS NULL`,
        [id]
      );

      if (studentRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Student not found.' });
        return;
      }

      const student = studentRes.rows[0];

      // 2. Enrolled courses with completion stats
      const enrollmentsRes = await db.query(
        `SELECT ce.id as enrollment_id, ce.course_id, ce.status as enrollment_status, ce.enrolled_at,
                c.title as course_title, c.instructor_name, c.thumbnail_url,
                (SELECT COUNT(cs.id) FROM course_subtopics cs JOIN course_topics ct ON ct.id = cs.topic_id WHERE ct.course_id = c.id) as total_subtopics,
                (SELECT COUNT(sp2.id) FROM student_progress sp2
                 JOIN course_subtopics cs2 ON cs2.id = sp2.subtopic_id
                 JOIN course_topics ct2 ON ct2.id = cs2.topic_id
                 WHERE ct2.course_id = c.id AND sp2.student_id = $1 AND sp2.is_completed = TRUE) as completed_subtopics,
                (SELECT sp3.last_accessed_at FROM student_progress sp3
                 JOIN course_subtopics cs3 ON cs3.id = sp3.subtopic_id
                 JOIN course_topics ct3 ON ct3.id = cs3.topic_id
                 WHERE ct3.course_id = c.id AND sp3.student_id = $1
                 ORDER BY sp3.last_accessed_at DESC LIMIT 1) as last_accessed_at,
                (SELECT cs4.title FROM student_progress sp4
                 JOIN course_subtopics cs4 ON cs4.id = sp4.subtopic_id
                 JOIN course_topics ct4 ON ct4.id = cs4.topic_id
                 WHERE ct4.course_id = c.id AND sp4.student_id = $1
                 ORDER BY sp4.last_accessed_at DESC LIMIT 1) as last_accessed_lesson
         FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id
         WHERE ce.student_id = $1
         ORDER BY ce.enrolled_at DESC`,
        [id]
      );

      // 3. Coding submissions stats
      const codingStatsRes = await db.query(
        `SELECT COUNT(*) as total_submissions,
                COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted_submissions,
                COALESCE(AVG(score), 0) as avg_score
         FROM coding_submissions
         WHERE student_id = $1`,
        [id]
      );

      // 4. MCQ attempts stats
      const mcqStatsRes = await db.query(
        `SELECT COUNT(*) as total_attempts,
                COUNT(*) FILTER (WHERE passed = TRUE) as passed_attempts,
                COALESCE(AVG(percentage), 0) as avg_score
         FROM mcq_attempts
         WHERE student_id = $1`,
        [id]
      );

      const courses = enrollmentsRes.rows.map((row) => {
        const total = parseInt(row.total_subtopics, 10) || 0;
        const completed = parseInt(row.completed_subtopics, 10) || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          enrollmentId: row.enrollment_id,
          courseId: row.course_id,
          courseTitle: row.course_title,
          instructorName: row.instructor_name,
          thumbnailUrl: row.thumbnail_url,
          enrollmentStatus: row.enrollment_status,
          enrolledAt: row.enrolled_at,
          totalSubtopics: total,
          completedSubtopics: completed,
          progressPercent: progress,
          lastAccessedAt: row.last_accessed_at,
          lastAccessedLesson: row.last_accessed_lesson || 'Not started yet',
        };
      });

      res.status(200).json({
        success: true,
        data: {
          student: {
            id: student.id,
            name: student.student_name,
            phone: student.phone,
            email: student.email,
            status: student.status,
            city: student.city,
            state: student.state,
            registeredAt: student.registered_at,
          },
          courses,
          codingStats: {
            totalSubmissions: parseInt(codingStatsRes.rows[0].total_submissions, 10) || 0,
            acceptedSubmissions: parseInt(codingStatsRes.rows[0].accepted_submissions, 10) || 0,
            avgScore: Math.round(parseFloat(codingStatsRes.rows[0].avg_score)),
          },
          mcqStats: {
            totalAttempts: parseInt(mcqStatsRes.rows[0].total_attempts, 10) || 0,
            passedAttempts: parseInt(mcqStatsRes.rows[0].passed_attempts, 10) || 0,
            avgScore: Math.round(parseFloat(mcqStatsRes.rows[0].avg_score)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 32: Course-level engagement and enrolled students roster
   */
  static async getCourseEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // course id

      const courseRes = await db.query('SELECT * FROM courses WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (courseRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Course not found.' });
        return;
      }

      const course = courseRes.rows[0];

      // Enrolled students list with their individual completion %
      const studentsRes = await db.query(
        `SELECT ce.student_id, ce.enrolled_at, ce.status as enrollment_status,
                u.phone, u.email, sp.full_name as student_name, sp.city,
                (SELECT COUNT(cs.id) FROM course_subtopics cs JOIN course_topics ct ON ct.id = cs.topic_id WHERE ct.course_id = $1) as total_subtopics,
                (SELECT COUNT(sp2.id) FROM student_progress sp2
                 JOIN course_subtopics cs2 ON cs2.id = sp2.subtopic_id
                 JOIN course_topics ct2 ON ct2.id = cs2.topic_id
                 WHERE ct2.course_id = $1 AND sp2.student_id = ce.student_id AND sp2.is_completed = TRUE) as completed_subtopics,
                (SELECT sp3.last_accessed_at FROM student_progress sp3
                 JOIN course_subtopics cs3 ON cs3.id = sp3.subtopic_id
                 JOIN course_topics ct3 ON ct3.id = cs3.topic_id
                 WHERE ct3.course_id = $1 AND sp3.student_id = ce.student_id
                 ORDER BY sp3.last_accessed_at DESC LIMIT 1) as last_active_at
         FROM course_enrollments ce
         JOIN users u ON u.id = ce.student_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE ce.course_id = $1
         ORDER BY ce.enrolled_at DESC`,
        [id]
      );

      let totalProgressSum = 0;
      const enrolledStudents = studentsRes.rows.map((row) => {
        const total = parseInt(row.total_subtopics, 10) || 0;
        const completed = parseInt(row.completed_subtopics, 10) || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        totalProgressSum += progress;

        return {
          studentId: row.student_id,
          studentName: row.student_name || 'Anonymous Student',
          phone: row.phone,
          email: row.email,
          city: row.city,
          enrollmentStatus: row.enrollment_status,
          enrolledAt: row.enrolled_at,
          totalSubtopics: total,
          completedSubtopics: completed,
          progressPercent: progress,
          lastActiveAt: row.last_active_at,
        };
      });

      const avgCourseProgress =
        enrolledStudents.length > 0 ? Math.round(totalProgressSum / enrolledStudents.length) : 0;

      res.status(200).json({
        success: true,
        data: {
          course: {
            id: course.id,
            title: course.title,
            instructorName: course.instructor_name,
            price: parseFloat(course.price),
            isPublished: course.is_published,
          },
          metrics: {
            totalEnrolledStudents: enrolledStudents.length,
            averageProgressPercent: avgCourseProgress,
          },
          students: enrolledStudents,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. COMPREHENSIVE AUDIT LOG STREAM (Section 33)
  // ---------------------------------------------------------------------------

  /**
   * Section 33: List searchable, filterable institutional audit logs
   */
  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '25', 10);
      const action = req.query.action as string;
      const entityName = req.query.entityName as string;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = ['1=1'];
      let queryParams: any[] = [];
      let idx = 1;

      if (action) {
        whereConditions.push(`al.action = $${idx++}`);
        queryParams.push(action);
      }

      if (entityName) {
        whereConditions.push(`al.entity_name = $${idx++}`);
        queryParams.push(entityName);
      }

      if (search) {
        whereConditions.push(
          `(al.action ILIKE $${idx} OR al.entity_name ILIKE $${idx} OR al.entity_id ILIKE $${idx} OR u.email ILIKE $${idx} OR ap.full_name ILIKE $${idx})`
        );
        queryParams.push(`%${search}%`);
        idx++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Total count
      const countRes = await db.query(
        `SELECT COUNT(*) as count
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.admin_id
         LEFT JOIN admin_profiles ap ON ap.user_id = u.id
         WHERE ${whereClause}`,
        queryParams
      );
      const total = parseInt(countRes.rows[0].count, 10);

      // Audit logs rows
      const logsRes = await db.query(
        `SELECT al.id, al.admin_id, al.action, al.entity_name, al.entity_id,
                al.old_values, al.new_values, al.ip_address, al.user_agent, al.created_at,
                u.email as admin_email,
                ap.full_name as admin_name
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.admin_id
         LEFT JOIN admin_profiles ap ON ap.user_id = u.id
         WHERE ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...queryParams, limit, offset]
      );

      // Distinct actions for UI filter dropdown
      const actionsRes = await db.query(`SELECT DISTINCT action FROM audit_logs ORDER BY action ASC`);

      res.status(200).json({
        success: true,
        data: logsRes.rows.map((row) => ({
          id: row.id,
          adminId: row.admin_id,
          adminEmail: row.admin_email || 'System / Service',
          adminName: row.admin_name || 'System Administrator',
          action: row.action,
          entityName: row.entity_name,
          entityId: row.entity_id,
          oldValues: row.old_values,
          newValues: row.new_values,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          createdAt: row.created_at,
        })),
        distinctActions: actionsRes.rows.map((r) => r.action),
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
}

/**
 * Format uptime seconds to human-readable string (e.g. "2h 45m")
 */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
