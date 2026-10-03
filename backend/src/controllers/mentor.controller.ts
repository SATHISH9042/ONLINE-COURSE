import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';

export class MentorController {
  /**
   * Get Mentor Dashboard Overview with KPIs and Assigned Students summary
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentorId = req.user!.id;

      // 1. Total assigned students
      const studentsCountRes = await db.query(
        `SELECT COUNT(*) as count FROM mentor_student_assignments WHERE mentor_id = $1`,
        [mentorId]
      );
      const totalStudents = parseInt(studentsCountRes.rows[0]?.count || '0', 10);

      // 2. Assigned student IDs array
      const assignedRes = await db.query(
        `SELECT student_id FROM mentor_student_assignments WHERE mentor_id = $1`,
        [mentorId]
      );
      const studentIds = assignedRes.rows.map((r: { student_id: string }) => r.student_id);

      if (studentIds.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            stats: {
              totalStudents: 0,
              activeStudents7Days: 0,
              avgCourseProgress: 0,
              totalClassesAttended: 0,
              totalLiveClasses: 0,
              avgAttendanceRate: 0,
            },
            assignedStudents: [],
            recentActivity: [],
          },
        });
        return;
      }

      // 3. Active students in the last 7 days
      const activeRes = await db.query(
        `SELECT COUNT(DISTINCT user_id) as active_count
         FROM user_login_history
         WHERE user_id = ANY($1::uuid[])
           AND login_at >= NOW() - INTERVAL '7 days'`,
        [studentIds]
      );
      const activeStudents7Days = parseInt(activeRes.rows[0]?.active_count || '0', 10);

      // 4. Live class attendance stats for assigned students
      const liveStatsRes = await db.query(
        `SELECT 
           (SELECT COUNT(*) FROM live_classes WHERE status IN ('COMPLETED', 'LIVE')) as total_classes,
           COUNT(lca.id) FILTER (WHERE lca.attended = TRUE AND lca.student_id = ANY($1::uuid[])) as total_attended
         FROM live_classes lc
         LEFT JOIN live_class_attendance lca ON lca.live_class_id = lc.id AND lca.student_id = ANY($1::uuid[])`,
        [studentIds]
      );
      const totalLiveClasses = parseInt(liveStatsRes.rows[0]?.total_classes || '0', 10);
      const totalClassesAttended = parseInt(liveStatsRes.rows[0]?.total_attended || '0', 10);
      const expectedPossibleAttendance = totalLiveClasses * studentIds.length;
      const avgAttendanceRate = expectedPossibleAttendance > 0
        ? Math.round((totalClassesAttended / expectedPossibleAttendance) * 100)
        : 0;

      // 5. Average course completion across assigned students
      const progressRes = await db.query(
        `WITH student_stats AS (
           SELECT 
             ce.student_id,
             COUNT(DISTINCT cs.id) as total_subtopics,
             COUNT(DISTINCT sp.subtopic_id) FILTER (WHERE sp.is_completed = TRUE) as completed_subtopics
           FROM course_enrollments ce
           JOIN course_topics ct ON ct.course_id = ce.course_id
           JOIN course_subtopics cs ON cs.topic_id = ct.id
           LEFT JOIN student_progress sp ON sp.student_id = ce.student_id AND sp.subtopic_id = cs.id
           WHERE ce.student_id = ANY($1::uuid[])
           GROUP BY ce.student_id
         )
         SELECT 
           COALESCE(AVG(CASE WHEN total_subtopics > 0 THEN (completed_subtopics::numeric / total_subtopics::numeric) * 100 ELSE 0 END), 0) as avg_progress
         FROM student_stats`,
        [studentIds]
      );
      const avgCourseProgress = Math.round(parseFloat(progressRes.rows[0]?.avg_progress || '0'));

      // 6. Assigned students list with summary indicators
      const studentsListRes = await db.query(
        `SELECT 
           u.id, u.email, u.phone, u.status, u.created_at,
           sp.full_name, sp.avatar_url, sp.city, sp.state,
           msa.created_at as assigned_at, msa.notes as mentor_notes,
           (SELECT COUNT(DISTINCT login_date) FROM user_login_history WHERE user_id = u.id) as total_login_days,
           (SELECT MAX(login_at) FROM user_login_history WHERE user_id = u.id) as last_login_at,
           (SELECT COUNT(*) FROM live_class_attendance WHERE student_id = u.id AND attended = TRUE) as live_classes_attended,
           (SELECT COUNT(*) FROM coding_submissions WHERE student_id = u.id AND status = 'ACCEPTED') as problems_solved,
           (SELECT COUNT(*) FROM mcq_attempts WHERE student_id = u.id) as tests_attempted,
           COALESCE((
             SELECT ROUND(AVG(sub_prog.pct))
             FROM (
               SELECT 
                 CASE WHEN COUNT(cs.id) > 0 
                      THEN (COUNT(prog.subtopic_id) FILTER (WHERE prog.is_completed = TRUE)::numeric / COUNT(cs.id)::numeric) * 100 
                      ELSE 0 END as pct
               FROM course_enrollments ce
               JOIN course_topics ct ON ct.course_id = ce.course_id
               JOIN course_subtopics cs ON cs.topic_id = ct.id
               LEFT JOIN student_progress prog ON prog.student_id = ce.student_id AND prog.subtopic_id = cs.id
               WHERE ce.student_id = u.id
               GROUP BY ce.course_id
             ) sub_prog
           ), 0) as avg_progress_pct
         FROM mentor_student_assignments msa
         JOIN users u ON u.id = msa.student_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE msa.mentor_id = $1
         ORDER BY sp.full_name ASC`,
        [mentorId]
      );

      // 7. Recent activity from assigned students (logins, submissions, quiz attempts)
      const recentLoginsRes = await db.query(
        `SELECT 
           ulh.user_id as student_id,
           COALESCE(sp.full_name, 'Student') as student_name,
           'LOGIN' as activity_type,
           'Logged into platform' as description,
           ulh.login_at as timestamp
         FROM user_login_history ulh
         JOIN student_profiles sp ON sp.user_id = ulh.user_id
         WHERE ulh.user_id = ANY($1::uuid[])
         ORDER BY ulh.login_at DESC
         LIMIT 6`,
        [studentIds]
      );

      const recentSubsRes = await db.query(
        `SELECT 
           cs.student_id,
           COALESCE(sp.full_name, 'Student') as student_name,
           'SUBMISSION' as activity_type,
           CONCAT('Submitted code for ', cp.title, ' (', cs.status, ')') as description,
           cs.submitted_at as timestamp
         FROM coding_submissions cs
         JOIN coding_problems cp ON cp.id = cs.problem_id
         JOIN student_profiles sp ON sp.user_id = cs.student_id
         WHERE cs.student_id = ANY($1::uuid[])
         ORDER BY cs.submitted_at DESC
         LIMIT 6`,
        [studentIds]
      );

      const combinedActivity = [...recentLoginsRes.rows, ...recentSubsRes.rows]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalStudents,
            activeStudents7Days,
            avgCourseProgress,
            totalClassesAttended,
            totalLiveClasses,
            avgAttendanceRate,
          },
          assignedStudents: studentsListRes.rows,
          recentActivity: combinedActivity,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all students assigned to this mentor
   */
  static async getAssignedStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentorId = req.user!.id;
      const search = (req.query.search as string || '').trim().toLowerCase();

      let query = `
        SELECT 
          u.id, u.email, u.phone, u.status, u.created_at as joined_at,
          sp.full_name, sp.avatar_url, sp.city, sp.state,
          msa.created_at as assigned_at, msa.notes as admin_assignment_notes,
          (SELECT COUNT(DISTINCT login_date) FROM user_login_history WHERE user_id = u.id) as total_login_days,
          (SELECT MAX(login_at) FROM user_login_history WHERE user_id = u.id) as last_login_at,
          (SELECT COUNT(*) FROM live_class_attendance WHERE student_id = u.id AND attended = TRUE) as live_classes_attended,
          (SELECT COUNT(*) FROM live_classes WHERE status IN ('COMPLETED', 'LIVE')) as total_live_classes,
          (SELECT COUNT(*) FROM coding_submissions WHERE student_id = u.id AND status = 'ACCEPTED') as problems_solved,
          (SELECT COUNT(*) FROM mcq_attempts WHERE student_id = u.id) as tests_attempted,
          COALESCE((
            SELECT ROUND(AVG(sub_prog.pct))
            FROM (
              SELECT 
                CASE WHEN COUNT(cs.id) > 0 
                     THEN (COUNT(prog.subtopic_id) FILTER (WHERE prog.is_completed = TRUE)::numeric / COUNT(cs.id)::numeric) * 100 
                     ELSE 0 END as pct
              FROM course_enrollments ce
              JOIN course_topics ct ON ct.course_id = ce.course_id
              JOIN course_subtopics cs ON cs.topic_id = ct.id
              LEFT JOIN student_progress prog ON prog.student_id = ce.student_id AND prog.subtopic_id = cs.id
              WHERE ce.student_id = u.id
              GROUP BY ce.course_id
            ) sub_prog
          ), 0) as avg_progress_pct
        FROM mentor_student_assignments msa
        JOIN users u ON u.id = msa.student_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE msa.mentor_id = $1
      `;

      const params: any[] = [mentorId];
      if (search) {
        query += ` AND (LOWER(sp.full_name) LIKE $2 OR LOWER(u.email) LIKE $2 OR u.phone LIKE $2)`;
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

  /**
   * Get exhaustive audit details for a specific student assigned to this mentor
   * Explicitly includes:
   * 1. Overall progress & course-by-course breakdown
   * 2. Live class attendance: each student class attended or not
   * 3. Login days: all records, count, streak, and dates
   * 4. Coding submissions & MCQ test attempts
   * 5. Mentor notes and observations
   */
  static async getStudentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentorId = req.user!.id;
      const { studentId } = req.params;

      // 1. Enforce strict isolation: Verify that student is assigned to this mentor
      const checkAssignment = await db.query(
        `SELECT id, created_at as assigned_at, notes FROM mentor_student_assignments WHERE mentor_id = $1 AND student_id = $2`,
        [mentorId, studentId]
      );

      if (checkAssignment.rowCount === 0) {
        res.status(403).json({
          success: false,
          code: 'UNAUTHORIZED_STUDENT_ACCESS',
          message: 'Access restricted: You can only view details of students assigned to you by an administrator.',
        });
        return;
      }

      const assignmentInfo = checkAssignment.rows[0];

      // 2. Student Profile
      const studentRes = await db.query(
        `SELECT u.id, u.email, u.phone, u.status, u.created_at,
                sp.full_name, sp.avatar_url, sp.bio, sp.city, sp.state
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.id = $1`,
        [studentId]
      );

      if (studentRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'STUDENT_NOT_FOUND',
          message: 'Student record not found.',
        });
        return;
      }

      const studentProfile = studentRes.rows[0];

      // 3. Enrolled Courses & Detailed Progress
      const coursesRes = await db.query(
        `SELECT 
           c.id as course_id, c.title, c.slug, c.thumbnail_url, c.duration_hours, c.instructor_name,
           ce.status as enrollment_status, ce.enrolled_at,
           COUNT(DISTINCT cs.id) as total_subtopics,
           COUNT(DISTINCT sp.subtopic_id) FILTER (WHERE sp.is_completed = TRUE) as completed_subtopics,
           MAX(sp.last_accessed_at) as last_accessed_at,
           CASE 
             WHEN COUNT(DISTINCT cs.id) > 0 
             THEN ROUND((COUNT(DISTINCT sp.subtopic_id) FILTER (WHERE sp.is_completed = TRUE)::numeric / COUNT(DISTINCT cs.id)::numeric) * 100)
             ELSE 0 
           END as progress_percentage
         FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id
         LEFT JOIN course_topics ct ON ct.course_id = c.id
         LEFT JOIN course_subtopics cs ON cs.topic_id = ct.id
         LEFT JOIN student_progress sp ON sp.student_id = ce.student_id AND sp.subtopic_id = cs.id
         WHERE ce.student_id = $1
         GROUP BY c.id, c.title, c.slug, c.thumbnail_url, c.duration_hours, c.instructor_name, ce.status, ce.enrolled_at
         ORDER BY ce.enrolled_at DESC`,
        [studentId]
      );

      // 4. Live Class Attendance ("each student class they can see or not")
      const liveClassesRes = await db.query(
        `SELECT 
           lc.id as live_class_id,
           lc.title,
           lc.instructor_name,
           lc.start_time,
           lc.end_time,
           lc.status,
           lc.meeting_link,
           COALESCE(lca.attended, FALSE) as attended,
           lca.joined_at,
           COALESCE(lca.duration_minutes, 0) as duration_minutes
         FROM live_classes lc
         LEFT JOIN live_class_attendance lca 
           ON lca.live_class_id = lc.id AND lca.student_id = $1
         ORDER BY lc.start_time DESC`,
        [studentId]
      );

      const totalClassesCount = liveClassesRes.rows.length;
      const attendedClassesCount = liveClassesRes.rows.filter(c => c.attended).length;
      const absentClassesCount = totalClassesCount - attendedClassesCount;

      // 5. Login Days & History ("login days all of the option")
      const loginHistoryRes = await db.query(
        `SELECT id, ip_address, user_agent, login_at, login_date
         FROM user_login_history
         WHERE user_id = $1
         ORDER BY login_at DESC
         LIMIT 100`,
        [studentId]
      );

      const uniqueDaysRes = await db.query(
        `SELECT login_date, COUNT(*) as login_count, MIN(login_at) as first_login_of_day
         FROM user_login_history
         WHERE user_id = $1
         GROUP BY login_date
         ORDER BY login_date DESC`,
        [studentId]
      );

      // Calculate streak
      let streak = 0;
      if (uniqueDaysRes.rows.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);
        const loginDatesSet = new Set(
          uniqueDaysRes.rows.map((r: { login_date: string | Date }) => {
            const d = new Date(r.login_date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })
        );

        // Check if logged in today or yesterday to start streak
        const formatD = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (!loginDatesSet.has(formatD(checkDate))) {
          // If not today, check yesterday
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (loginDatesSet.has(formatD(checkDate))) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      // 6. Coding Submissions
      const submissionsRes = await db.query(
        `SELECT 
           cs.id, cs.problem_id, cp.title as problem_title,
           cs.language, cs.status, cs.score, cs.test_cases_passed, cs.total_test_cases,
           cs.execution_time_ms, cs.submitted_at
         FROM coding_submissions cs
         JOIN coding_problems cp ON cp.id = cs.problem_id
         WHERE cs.student_id = $1
         ORDER BY cs.submitted_at DESC
         LIMIT 50`,
        [studentId]
      );

      // 7. MCQ Test Attempts
      const mcqAttemptsRes = await db.query(
        `SELECT 
           ma.id, ma.subtopic_id, cs.title as subtopic_title,
           ma.score, ma.total_questions, ma.percentage, ma.passed, ma.attempt_number, ma.created_at
         FROM mcq_attempts ma
         JOIN course_subtopics cs ON cs.id = ma.subtopic_id
         WHERE ma.student_id = $1
         ORDER BY ma.created_at DESC
         LIMIT 50`,
        [studentId]
      );

      // 8. Mentor Notes
      const notesRes = await db.query(
        `SELECT msn.id, msn.note, msn.tag, msn.created_at,
                mp.full_name as author_name,
                (msn.mentor_id = $1) as is_own_note
         FROM mentor_student_notes msn
         LEFT JOIN mentor_profiles mp ON mp.user_id = msn.mentor_id
         WHERE msn.student_id = $2
         ORDER BY msn.created_at DESC`,
        [mentorId, studentId]
      );

      res.status(200).json({
        success: true,
        data: {
          student: studentProfile,
          assignment: assignmentInfo,
          courses: coursesRes.rows,
          liveClasses: {
            summary: {
              total: totalClassesCount,
              attended: attendedClassesCount,
              absent: absentClassesCount,
              attendanceRate: totalClassesCount > 0 ? Math.round((attendedClassesCount / totalClassesCount) * 100) : 0,
            },
            records: liveClassesRes.rows,
          },
          loginActivity: {
            summary: {
              totalLoginDays: uniqueDaysRes.rows.length,
              totalLogins: loginHistoryRes.rows.length,
              currentStreakDays: streak,
              firstLoginAt: loginHistoryRes.rows[loginHistoryRes.rows.length - 1]?.login_at || null,
              lastLoginAt: loginHistoryRes.rows[0]?.login_at || null,
            },
            uniqueDays: uniqueDaysRes.rows,
            history: loginHistoryRes.rows,
          },
          codingSubmissions: submissionsRes.rows,
          mcqAttempts: mcqAttemptsRes.rows,
          mentorNotes: notesRes.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add a mentor feedback or observation note for an assigned student
   */
  static async addStudentNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentorId = req.user!.id;
      const { studentId } = req.params;
      const { note, tag } = req.body;

      if (!note || !note.trim()) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Note content cannot be empty.',
        });
        return;
      }

      // Check assignment
      const checkAssignment = await db.query(
        `SELECT id FROM mentor_student_assignments WHERE mentor_id = $1 AND student_id = $2`,
        [mentorId, studentId]
      );

      if (checkAssignment.rowCount === 0) {
        res.status(403).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Cannot add notes for a student not assigned to you.',
        });
        return;
      }

      const insertRes = await db.query(
        `INSERT INTO mentor_student_notes (mentor_id, student_id, note, tag)
         VALUES ($1, $2, $3, $4)
         RETURNING id, mentor_id, student_id, note, tag, created_at`,
        [mentorId, studentId, note.trim(), (tag || 'General').trim()]
      );

      res.status(201).json({
        success: true,
        message: 'Feedback note saved successfully.',
        data: insertRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a mentor feedback note
   */
  static async deleteStudentNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentorId = req.user!.id;
      const { noteId } = req.params;

      const deleteRes = await db.query(
        `DELETE FROM mentor_student_notes WHERE id = $1 AND mentor_id = $2 RETURNING id`,
        [noteId, mentorId]
      );

      if (deleteRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: 'Note not found or you do not have permission to delete it.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Note removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
