import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { z } from 'zod';

export class StudentDashboardController {
  /**
   * Section 7: HOME Page - Aggregated student overview
   * Shows: Continue Learning, recently accessed courses, upcoming live classes,
   * unread notifications, and overall learning progress.
   */
  static async getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;

      // 1. Fetch Enrolled Courses with progress counts
      const enrolledCoursesRes = await db.query(
        `SELECT c.id, c.title, c.slug, c.short_description, c.thumbnail_url,
                c.instructor_name, c.duration_hours, ce.enrolled_at,
                (SELECT COUNT(DISTINCT ct.id) FROM course_topics ct WHERE ct.course_id = c.id) as total_topics,
                (SELECT COUNT(cs.id) FROM course_subtopics cs JOIN course_topics ct ON ct.id = cs.topic_id WHERE ct.course_id = c.id) as total_subtopics,
                (SELECT COUNT(sp.id) FROM student_progress sp 
                 JOIN course_subtopics cs ON cs.id = sp.subtopic_id 
                 JOIN course_topics ct ON ct.id = cs.topic_id 
                 WHERE ct.course_id = c.id AND sp.student_id = $1 AND sp.is_completed = TRUE) as completed_subtopics
         FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id
         WHERE ce.student_id = $1 AND ce.status = 'ACTIVE' AND c.deleted_at IS NULL
         ORDER BY ce.updated_at DESC`,
        [studentId]
      );

      const enrolledCourses = enrolledCoursesRes.rows.map((row) => {
        const total = parseInt(row.total_subtopics, 10) || 0;
        const completed = parseInt(row.completed_subtopics, 10) || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...row,
          total_topics: parseInt(row.total_topics, 10) || 0,
          total_subtopics: total,
          completed_subtopics: completed,
          progress_percent: progress,
        };
      });

      // 2. Section 7: "Continue Learning" widget
      // Look up student's most recently accessed subtopic
      let continueLearning: any = null;

      const recentProgressRes = await db.query(
        `SELECT c.id as course_id, c.title as course_title,
                ct.id as topic_id, ct.title as topic_title,
                cs.id as subtopic_id, cs.title as subtopic_title,
                sp.is_completed, sp.last_accessed_at,
                (SELECT COUNT(cs2.id) FROM course_subtopics cs2 JOIN course_topics ct2 ON ct2.id = cs2.topic_id WHERE ct2.course_id = c.id) as total_subtopics,
                (SELECT COUNT(sp2.id) FROM student_progress sp2 
                 JOIN course_subtopics cs2 ON cs2.id = sp2.subtopic_id 
                 JOIN course_topics ct2 ON ct2.id = cs2.topic_id 
                 WHERE ct2.course_id = c.id AND sp2.student_id = $1 AND sp2.is_completed = TRUE) as completed_subtopics
         FROM student_progress sp
         JOIN course_subtopics cs ON cs.id = sp.subtopic_id
         JOIN course_topics ct ON ct.id = cs.topic_id
         JOIN courses c ON c.id = ct.course_id
         WHERE sp.student_id = $1 AND c.deleted_at IS NULL
         ORDER BY sp.last_accessed_at DESC
         LIMIT 1`,
        [studentId]
      );

      if (recentProgressRes.rowCount > 0) {
        const item = recentProgressRes.rows[0];
        const total = parseInt(item.total_subtopics, 10) || 0;
        const completed = parseInt(item.completed_subtopics, 10) || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        continueLearning = {
          courseId: item.course_id,
          courseTitle: item.course_title,
          topicId: item.topic_id,
          topicTitle: item.topic_title,
          subtopicId: item.subtopic_id,
          subtopicTitle: item.subtopic_title,
          progressPercent: progress,
          isCompleted: item.is_completed,
          lastAccessedAt: item.last_accessed_at,
        };
      } else if (enrolledCourses.length > 0) {
        // Fallback: If enrolled but hasn't accessed yet, default to first topic & subtopic (Section 13)
        const firstCourse = enrolledCourses[0];
        const firstSubtopicRes = await db.query(
          `SELECT ct.id as topic_id, ct.title as topic_title,
                  cs.id as subtopic_id, cs.title as subtopic_title
           FROM course_topics ct
           JOIN course_subtopics cs ON cs.topic_id = ct.id
           WHERE ct.course_id = $1
           ORDER BY ct.sort_order ASC, cs.sort_order ASC
           LIMIT 1`,
          [firstCourse.id]
        );

        if (firstSubtopicRes.rowCount > 0) {
          const firstItem = firstSubtopicRes.rows[0];
          continueLearning = {
            courseId: firstCourse.id,
            courseTitle: firstCourse.title,
            topicId: firstItem.topic_id,
            topicTitle: firstItem.topic_title,
            subtopicId: firstItem.subtopic_id,
            subtopicTitle: firstItem.subtopic_title,
            progressPercent: firstCourse.progress_percent || 0,
            isCompleted: false,
            lastAccessedAt: null,
          };
        }
      }

      // 3. Upcoming Live Classes
      const liveClassesRes = await db.query(
        `SELECT lc.id, lc.title, lc.description, lc.instructor_name, lc.start_time, lc.end_time,
                lc.meeting_link, lc.status, c.title as course_title
         FROM live_classes lc
         LEFT JOIN courses c ON c.id = lc.course_id
         WHERE lc.status IN ('UPCOMING', 'LIVE') AND lc.start_time >= NOW() - INTERVAL '3 hours'
         ORDER BY lc.start_time ASC
         LIMIT 3`
      );

      // 4. Unread Notifications Count & Recent List
      const notifCountRes = await db.query(
        `SELECT COUNT(*) as unread_count
         FROM notification_recipients nr
         WHERE nr.student_id = $1 AND nr.is_read = FALSE`,
        [studentId]
      );
      const unreadNotificationsCount = parseInt(notifCountRes.rows[0].unread_count, 10) || 0;

      const recentNotifsRes = await db.query(
        `SELECT n.id, n.title, n.message, n.type, n.target_type, n.target_id, n.created_at, nr.is_read
         FROM notification_recipients nr
         JOIN notifications n ON n.id = nr.notification_id
         WHERE nr.student_id = $1
         ORDER BY n.created_at DESC
         LIMIT 4`,
        [studentId]
      );

      // 5. Overall Learning Progress Calculation
      let totalAllSubtopics = 0;
      let completedAllSubtopics = 0;
      for (const c of enrolledCourses) {
        totalAllSubtopics += c.total_subtopics;
        completedAllSubtopics += c.completed_subtopics;
      }
      const overallProgress = totalAllSubtopics > 0
        ? Math.round((completedAllSubtopics / totalAllSubtopics) * 100)
        : 0;

      res.status(200).json({
        success: true,
        data: {
          continueLearning,
          enrolledCourses,
          upcomingLiveClasses: liveClassesRes.rows,
          unreadNotificationsCount,
          recentNotifications: recentNotifsRes.rows,
          stats: {
            enrolledCoursesCount: enrolledCourses.length,
            completedLessonsCount: completedAllSubtopics,
            totalLessonsCount: totalAllSubtopics,
            overallProgressPercent: overallProgress,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 8: MY COURSES
   * Display all courses purchased by the student with progress and last accessed lesson
   */
  static async getMyCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;

      const coursesRes = await db.query(
        `SELECT c.id, c.title, c.slug, c.short_description, c.description, c.thumbnail_url,
                c.instructor_name, c.duration_hours, c.price, ce.enrolled_at,
                (SELECT COUNT(DISTINCT ct.id) FROM course_topics ct WHERE ct.course_id = c.id) as total_topics,
                (SELECT COUNT(cs.id) FROM course_subtopics cs JOIN course_topics ct ON ct.id = cs.topic_id WHERE ct.course_id = c.id) as total_subtopics,
                (SELECT COUNT(sp.id) FROM student_progress sp 
                 JOIN course_subtopics cs ON cs.id = sp.subtopic_id 
                 JOIN course_topics ct ON ct.id = cs.topic_id 
                 WHERE ct.course_id = c.id AND sp.student_id = $1 AND sp.is_completed = TRUE) as completed_subtopics,
                (SELECT cs.title FROM student_progress sp 
                 JOIN course_subtopics cs ON cs.id = sp.subtopic_id 
                 JOIN course_topics ct ON ct.id = cs.topic_id 
                 WHERE ct.course_id = c.id AND sp.student_id = $1 
                 ORDER BY sp.last_accessed_at DESC LIMIT 1) as last_accessed_lesson
         FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id
         WHERE ce.student_id = $1 AND ce.status = 'ACTIVE' AND c.deleted_at IS NULL
         ORDER BY ce.enrolled_at DESC`,
        [studentId]
      );

      const formatted = coursesRes.rows.map((row) => {
        const total = parseInt(row.total_subtopics, 10) || 0;
        const completed = parseInt(row.completed_subtopics, 10) || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          id: row.id,
          title: row.title,
          slug: row.slug,
          shortDescription: row.short_description,
          description: row.description,
          thumbnailUrl: row.thumbnail_url,
          instructorName: row.instructor_name,
          durationHours: row.duration_hours,
          enrolledAt: row.enrolled_at,
          totalTopics: parseInt(row.total_topics, 10) || 0,
          totalSubtopics: total,
          completedSubtopics: completed,
          progressPercent: progress,
          lastAccessedLesson: row.last_accessed_lesson || 'Not started yet',
        };
      });

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 23: STUDENT PROFILE
   * View profile and enrolled courses summary
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;

      const profileRes = await db.query(
        `SELECT u.id, u.phone, u.email, u.status, u.created_at as registered_at,
                sp.full_name, sp.avatar_url, sp.bio, sp.city, sp.state,
                (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.student_id = u.id AND ce.status = 'ACTIVE') as enrolled_courses_count
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [studentId]
      );

      if (profileRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'PROFILE_NOT_FOUND',
          message: 'Student profile not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: profileRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 23: Update allowed student profile fields
   * Protected: phone number and account status are strictly immutable by the student
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;

      const updateSchema = z.object({
        fullName: z.string().trim().min(2).max(100).optional(),
        email: z.string().trim().email().optional().or(z.literal('')),
        city: z.string().trim().max(100).optional(),
        state: z.string().trim().max(100).optional(),
        bio: z.string().trim().max(500).optional(),
        avatarUrl: z.string().trim().url().optional().or(z.literal('')),
      });

      const data = updateSchema.parse(req.body);

      // Check email uniqueness if email provided and different from current
      if (data.email) {
        const existingEmail = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [data.email.toLowerCase(), studentId]
        );
        if (existingEmail.rowCount > 0) {
          res.status(409).json({
            success: false,
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'This email address is already in use by another account.',
          });
          return;
        }
      }

      await db.transaction(async (tx) => {
        if (data.email !== undefined) {
          await tx.query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
            [data.email ? data.email.toLowerCase() : null, studentId]
          );
        }

        const profileFields: string[] = [];
        const profileValues: any[] = [];
        let pIdx = 1;

        if (data.fullName !== undefined) {
          profileFields.push(`full_name = $${pIdx++}`);
          profileValues.push(data.fullName);
        }
        if (data.city !== undefined) {
          profileFields.push(`city = $${pIdx++}`);
          profileValues.push(data.city);
        }
        if (data.state !== undefined) {
          profileFields.push(`state = $${pIdx++}`);
          profileValues.push(data.state);
        }
        if (data.bio !== undefined) {
          profileFields.push(`bio = $${pIdx++}`);
          profileValues.push(data.bio);
        }
        if (data.avatarUrl !== undefined) {
          profileFields.push(`avatar_url = $${pIdx++}`);
          profileValues.push(data.avatarUrl);
        }

        if (profileFields.length > 0) {
          profileFields.push(`updated_at = NOW()`);
          profileValues.push(studentId);
          await tx.query(
            `UPDATE student_profiles SET ${profileFields.join(', ')} WHERE user_id = $${pIdx}`,
            profileValues
          );
        }
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 24: FAQ / Help
   */
  static async getFaqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const faqsRes = await db.query(
        'SELECT id, category, question, answer, sort_order FROM faqs WHERE is_published = TRUE ORDER BY category ASC, sort_order ASC'
      );

      res.status(200).json({
        success: true,
        data: faqsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }
}
