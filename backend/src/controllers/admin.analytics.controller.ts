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

  // ---------------------------------------------------------------------------
  // 4. FINANCIAL DASHBOARD & PROFIT/SUBSCRIPTION ANALYTICS (Section 36)
  // ---------------------------------------------------------------------------

  /**
   * Section 36: Dedicated Financial Dashboard Analytics
   * Profit & loss, MRR/ARR, monthly and yearly records, course subscription revenue breakdown.
   */
  static async getFinancialDashboardAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. All-time Financial KPI Summary
      const summaryRes = await db.query(`
        SELECT 
          COALESCE(SUM(amount) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')), 0) as gross_revenue,
          COALESCE(SUM(amount) FILTER (WHERE status::text = 'REFUNDED'), 0) as total_refunded,
          COALESCE(SUM(amount) FILTER (WHERE status::text = 'PENDING'), 0) as total_pending,
          COALESCE(SUM(amount) FILTER (WHERE status::text = 'FAILED'), 0) as total_failed,
          COUNT(*) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')) as successful_transactions,
          COUNT(*) FILTER (WHERE status::text = 'PENDING') as pending_transactions,
          COUNT(*) FILTER (WHERE status::text = 'REFUNDED') as refunded_transactions,
          COUNT(*) as total_transactions,
          COUNT(DISTINCT student_id) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')) as paying_customers
        FROM payments
      `);
      const s = summaryRes.rows[0] || {};
      const grossRevenue = parseFloat(s.gross_revenue) || 0;
      const totalRefunded = parseFloat(s.total_refunded) || 0;
      const netRevenue = Math.max(grossRevenue - totalRefunded, 0);

      // Operational overhead (approx 12% across payment gateways, servers, video delivery)
      const estimatedExpenses = Math.round(netRevenue * 0.12 * 100) / 100;
      const netProfit = Math.max(netRevenue - estimatedExpenses, 0);
      const profitMarginPercent = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 100) : 0;
      const successfulCount = parseInt(s.successful_transactions, 10) || 0;
      const avgOrderValue = successfulCount > 0 ? Math.round(netRevenue / successfulCount) : 0;

      // 2. Current Month vs Previous Month (MoM MRR & Growth)
      const currentMonthRes = await db.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as current_mrr,
          COUNT(*) as current_orders
        FROM payments
        WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `);
      const prevMonthRes = await db.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as prev_mrr,
          COUNT(*) as prev_orders
        FROM payments
        WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < DATE_TRUNC('month', CURRENT_DATE)
      `);
      const currentMrr = parseFloat(currentMonthRes.rows[0]?.current_mrr) || 0;
      const prevMrr = parseFloat(prevMonthRes.rows[0]?.prev_mrr) || 0;
      const mrrGrowthPercent = prevMrr > 0 ? Math.round(((currentMrr - prevMrr) / prevMrr) * 100) : 0;
      const annualRunRate = currentMrr * 12;

      // 3. Monthly Breakdown (Monthly Trends & Performance)
      const monthlyRes = await db.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month_key,
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month_label,
          CAST(EXTRACT(YEAR FROM DATE_TRUNC('month', created_at)) AS INTEGER) as year_num,
          CAST(EXTRACT(MONTH FROM DATE_TRUNC('month', created_at)) AS INTEGER) as month_num,
          COALESCE(SUM(amount) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')), 0) as gross,
          COALESCE(SUM(amount) FILTER (WHERE status::text = 'REFUNDED'), 0) as refunds,
          COUNT(*) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')) as orders,
          COUNT(DISTINCT student_id) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')) as students
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `);

      let prevMonthGross = 0;
      const monthlyRecords = (monthlyRes.rows || []).map((row) => {
        const gross = parseFloat(row.gross) || 0;
        const refunds = parseFloat(row.refunds) || 0;
        const net = Math.max(gross - refunds, 0);
        const exp = Math.round(net * 0.12 * 100) / 100;
        const profit = Math.max(net - exp, 0);
        const margin = net > 0 ? Math.round((profit / net) * 100) : 0;
        const growth = prevMonthGross > 0 ? Math.round(((gross - prevMonthGross) / prevMonthGross) * 100) : 0;
        prevMonthGross = gross;

        return {
          monthKey: row.month_key || '',
          monthLabel: row.month_label || 'Period',
          year: parseInt(row.year_num, 10) || new Date().getFullYear(),
          grossRevenue: gross,
          refunds,
          netRevenue: net,
          estimatedExpenses: exp,
          netProfit: profit,
          profitMarginPercent: margin,
          ordersCount: parseInt(row.orders, 10) || 0,
          payingStudentsCount: parseInt(row.students, 10) || 0,
          growthPercent: growth,
        };
      });

      // 4. Yearly Breakdown (Year-over-Year Performance)
      const yearlyRes = await db.query(`
        SELECT 
          CAST(EXTRACT(YEAR FROM created_at) AS INTEGER) as year,
          COALESCE(SUM(amount) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')), 0) as gross,
          COALESCE(SUM(amount) FILTER (WHERE status::text = 'REFUNDED'), 0) as refunds,
          COUNT(*) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')) as orders,
          COUNT(DISTINCT student_id) FILTER (WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')) as students
        FROM payments
        GROUP BY EXTRACT(YEAR FROM created_at)
        ORDER BY EXTRACT(YEAR FROM created_at) DESC
      `);

      const yearlyRecords = (yearlyRes.rows || []).map((row) => {
        const gross = parseFloat(row.gross) || 0;
        const refunds = parseFloat(row.refunds) || 0;
        const net = Math.max(gross - refunds, 0);
        const exp = Math.round(net * 0.12 * 100) / 100;
        const profit = Math.max(net - exp, 0);
        const margin = net > 0 ? Math.round((profit / net) * 100) : 0;

        return {
          year: parseInt(row.year, 10) || new Date().getFullYear(),
          grossRevenue: gross,
          refunds,
          netRevenue: net,
          estimatedExpenses: exp,
          netProfit: profit,
          profitMarginPercent: margin,
          ordersCount: parseInt(row.orders, 10) || 0,
          uniqueStudentsCount: parseInt(row.students, 10) || 0,
        };
      });

      // 5. Course Subscription & Revenue Breakdown
      const courseRevRes = await db.query(`
        SELECT 
          c.id as course_id,
          c.title as course_title,
          c.instructor_name,
          c.price,
          COUNT(p.id) as orders_count,
          COALESCE(SUM(p.amount), 0) as gross_revenue
        FROM courses c
        JOIN payments p ON p.course_id = c.id AND p.status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')
        WHERE c.deleted_at IS NULL
        GROUP BY c.id, c.title, c.instructor_name, c.price
        ORDER BY gross_revenue DESC
      `);

      const courseBreakdown = (courseRevRes.rows || []).map((r) => {
        const rev = parseFloat(r.gross_revenue) || 0;
        const exp = Math.round(rev * 0.12 * 100) / 100;
        const profit = Math.max(rev - exp, 0);
        return {
          courseId: r.course_id,
          courseTitle: r.course_title || 'Untitled Course',
          instructorName: r.instructor_name || 'Academic Faculty',
          unitPrice: parseFloat(r.price) || 0,
          ordersCount: parseInt(r.orders_count, 10) || 0,
          grossRevenue: rev,
          netProfit: profit,
          revenueSharePercent: grossRevenue > 0 ? Math.round((rev / grossRevenue) * 100) : 0,
        };
      });

      // 6. Payment Method Breakdown
      const methodRes = await db.query(`
        SELECT 
          payment_method::text as payment_method,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM payments
        WHERE status::text IN ('SUCCESS', 'MANUALLY_VERIFIED')
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `);

      const paymentMethodBreakdown = (methodRes.rows || []).map((r) => ({
        method: r.payment_method || 'RAZORPAY',
        count: parseInt(r.count, 10) || 0,
        totalAmount: parseFloat(r.total_amount) || 0,
        percent: grossRevenue > 0 ? Math.round(((parseFloat(r.total_amount) || 0) / grossRevenue) * 100) : 0,
      }));

      // 7. Recent Financial Ledger Entries (Audit trail)
      const ledgerRes = await db.query(`
        SELECT 
          p.id, p.order_id, p.payment_id, p.amount, p.currency, p.status::text as status, p.payment_method::text as payment_method,
          p.created_at, p.verified_at,
          COALESCE(c.title, 'General Course / Subscription') as course_title,
          COALESCE(sp.full_name, u.phone, 'Student') as student_name,
          u.phone as student_phone,
          u.email as student_email
        FROM payments p
        LEFT JOIN courses c ON c.id = p.course_id
        LEFT JOIN users u ON u.id = p.student_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `);

      const ledgerEntries = (ledgerRes.rows || []).map((r) => ({
        id: r.id,
        orderId: r.order_id || 'ORD-0000',
        paymentId: r.payment_id,
        amount: parseFloat(r.amount) || 0,
        currency: r.currency || 'INR',
        status: r.status || 'SUCCESS',
        paymentMethod: r.payment_method || 'RAZORPAY',
        createdAt: r.created_at,
        verifiedAt: r.verified_at,
        courseTitle: r.course_title || 'General Course',
        studentName: r.student_name || 'Student',
        studentEmail: r.student_email,
        studentPhone: r.student_phone || '',
      }));

      res.status(200).json({
        success: true,
        data: {
          summary: {
            grossRevenue,
            totalRefunded,
            netRevenue,
            estimatedExpenses,
            netProfit,
            profitMarginPercent,
            currentMrr,
            annualRunRate,
            mrrGrowthPercent,
            avgOrderValue,
            totalTransactions: parseInt(s.total_transactions, 10) || 0,
            successfulTransactions: successfulCount,
            pendingTransactions: parseInt(s.pending_transactions, 10) || 0,
            refundedTransactions: parseInt(s.refunded_transactions, 10) || 0,
            payingCustomers: parseInt(s.paying_customers, 10) || 0,
          },
          monthlyRecords,
          yearlyRecords,
          courseBreakdown,
          paymentMethodBreakdown,
          ledgerEntries,
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
