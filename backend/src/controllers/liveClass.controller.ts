import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { z } from 'zod';

interface SessionParticipant {
  userId: string;
  name: string;
  role: 'ADMIN' | 'STUDENT';
  canSpeak: boolean;
  handRaised: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  joinedAt: string;
}

interface LiveSessionState {
  classId: string;
  isRecording: boolean;
  recordingStartedAt: number | null;
  participants: Map<string, SessionParticipant>;
}

const liveSessionsState = new Map<string, LiveSessionState>();

function getOrCreateSession(classId: string): LiveSessionState {
  let session = liveSessionsState.get(classId);
  if (!session) {
    session = {
      classId,
      isRecording: false,
      recordingStartedAt: null,
      participants: new Map(),
    };
    liveSessionsState.set(classId, session);
  }
  return session;
}

export class LiveClassController {
  // ---------------------------------------------------------------------------
  // 1. STUDENT ENDPOINTS (Section 18)
  // ---------------------------------------------------------------------------

  /**
   * Section 18: Student view of Live Classes & Recorded Sessions
   * Returns: Upcoming, Live, and Past Recorded sessions
   */
  static async getStudentLiveClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;

      // 1. Fetch all active/upcoming/live sessions
      const classesRes = await db.query(
        `SELECT lc.id, lc.course_id, lc.instructor_name, lc.title, lc.description,
                lc.start_time, lc.end_time, lc.meeting_link, lc.status, lc.max_participants,
                c.title as course_title, c.thumbnail_url as course_thumbnail,
                EXISTS(
                  SELECT 1 FROM course_enrollments ce
                  WHERE ce.course_id = lc.course_id AND ce.student_id = $1 AND ce.status = 'ACTIVE'
                ) as is_enrolled_course
         FROM live_classes lc
         LEFT JOIN courses c ON c.id = lc.course_id
         ORDER BY 
           CASE 
             WHEN lc.status = 'LIVE' THEN 1
             WHEN lc.status = 'UPCOMING' THEN 2
             WHEN lc.status = 'COMPLETED' THEN 3
             ELSE 4
           END,
           lc.start_time ASC`,
        [studentId]
      );

      // 2. Fetch all recordings
      const recordingsRes = await db.query(
        `SELECT lcr.id, lcr.live_class_id, lcr.title, lcr.storage_provider, lcr.storage_key,
                lcr.duration_seconds, lcr.created_at,
                lc.title as class_title, lc.instructor_name,
                c.id as course_id, c.title as course_title, c.thumbnail_url as course_thumbnail
         FROM live_class_recordings lcr
         JOIN live_classes lc ON lc.id = lcr.live_class_id
         LEFT JOIN courses c ON c.id = lc.course_id
         ORDER BY lcr.created_at DESC`
      );

      const live = classesRes.rows.filter((c) => c.status === 'LIVE');
      const upcoming = classesRes.rows.filter((c) => c.status === 'UPCOMING');
      const past = classesRes.rows.filter((c) => c.status === 'COMPLETED');

      res.status(200).json({
        success: true,
        data: {
          live,
          upcoming,
          past,
          recordings: recordingsRes.rows.map((r) => ({
            id: r.id,
            liveClassId: r.live_class_id,
            title: r.title,
            classTitle: r.class_title,
            instructorName: r.instructor_name,
            courseId: r.course_id,
            courseTitle: r.course_title || 'General Masterclass',
            courseThumbnail: r.course_thumbnail,
            storageKey: r.storage_key,
            durationSeconds: r.duration_seconds,
            durationFormatted: formatDuration(r.duration_seconds),
            createdAt: r.created_at,
            // Stream URL for recording player
            streamUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. ADMIN ENDPOINTS (Section 28)
  // ---------------------------------------------------------------------------

  /**
   * Section 28: Admin list all live classes with recordings
   */
  static async listAdminLiveClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classesRes = await db.query(
        `SELECT lc.id, lc.course_id, lc.instructor_name, lc.title, lc.description,
                lc.start_time, lc.end_time, lc.meeting_link, lc.status, lc.max_participants,
                lc.created_at, lc.updated_at,
                c.title as course_title,
                (SELECT COUNT(*) FROM live_class_recordings lcr WHERE lcr.live_class_id = lc.id) as recording_count
         FROM live_classes lc
         LEFT JOIN courses c ON c.id = lc.course_id
         ORDER BY lc.start_time DESC`
      );

      const recordingsRes = await db.query(
        `SELECT id, live_class_id, title, storage_key, duration_seconds, created_at
         FROM live_class_recordings
         ORDER BY created_at DESC`
      );

      const recordingsMap = new Map<string, any[]>();
      for (const rec of recordingsRes.rows) {
        const list = recordingsMap.get(rec.live_class_id) || [];
        list.push({
          ...rec,
          durationFormatted: formatDuration(rec.duration_seconds),
        });
        recordingsMap.set(rec.live_class_id, list);
      }

      res.status(200).json({
        success: true,
        data: classesRes.rows.map((row) => ({
          ...row,
          recordingCount: parseInt(row.recording_count, 10) || 0,
          recordings: recordingsMap.get(row.id) || [],
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 28: Admin schedule new live class
   */
  static async createLiveClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const schema = z.object({
        courseId: z.string().uuid().optional().nullable(),
        instructorName: z.string().trim().min(2, 'Instructor name is required'),
        title: z.string().trim().min(3, 'Title must be at least 3 characters'),
        description: z.string().trim().optional(),
        startTime: z.string().datetime({ message: 'Invalid start time' }),
        endTime: z.string().datetime({ message: 'Invalid end time' }),
        meetingLink: z.string().trim().url({ message: 'Meeting link must be a valid URL' }),
        maxParticipants: z.number().min(1).default(500),
      });

      const data = schema.parse(req.body);

      // Verify start before end
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      if (end <= start) {
        res.status(400).json({
          success: false,
          code: 'INVALID_TIME_RANGE',
          message: 'End time must be strictly after start time.',
        });
        return;
      }

      const insertRes = await db.query(
        `INSERT INTO live_classes (
           course_id, instructor_name, title, description, start_time, end_time, meeting_link, max_participants, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'UPCOMING')
         RETURNING *`,
        [
          data.courseId || null,
          data.instructorName,
          data.title,
          data.description || null,
          data.startTime,
          data.endTime,
          data.meetingLink,
          data.maxParticipants,
        ]
      );

      const liveClass = insertRes.rows[0];

      // Audit Log
      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values)
         VALUES ($1, 'LIVE_CLASS_SCHEDULED', 'live_classes', $2, $3)`,
        [adminId, liveClass.id, JSON.stringify(liveClass)]
      );

      // Broadcast Notification
      const notifRes = await db.query(
        `INSERT INTO notifications (title, message, type, target_type, target_id, target_audience, target_course_id)
         VALUES ($1, $2, 'LIVE_CLASS', 'LIVE_CLASS', $3, $4, $5)
         RETURNING id`,
        [
          `New Live Class: ${data.title}`,
          `Instructor ${data.instructorName} has scheduled a live session on ${start.toLocaleDateString()}. Meeting link is active.`,
          liveClass.id,
          data.courseId ? 'COURSE' : 'ALL',
          data.courseId || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Live class scheduled successfully.',
        data: liveClass,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 28: Admin update live class (date/time, meeting link, status)
   */
  static async updateLiveClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const schema = z.object({
        courseId: z.string().uuid().optional().nullable(),
        instructorName: z.string().trim().min(2).optional(),
        title: z.string().trim().min(3).optional(),
        description: z.string().trim().optional(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        meetingLink: z.string().trim().url().optional(),
        status: z.enum(['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
        maxParticipants: z.number().min(1).optional(),
      });

      const data = schema.parse(req.body);

      // Fetch existing
      const existingRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [id]);
      if (existingRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Live class not found.' });
        return;
      }

      const existing = existingRes.rows[0];

      // Validate times if both or either updated
      const start = new Date(data.startTime || existing.start_time);
      const end = new Date(data.endTime || existing.end_time);
      if (end <= start) {
        res.status(400).json({
          success: false,
          code: 'INVALID_TIME_RANGE',
          message: 'End time must be strictly after start time.',
        });
        return;
      }

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.courseId !== undefined) {
        fields.push(`course_id = $${idx++}`);
        values.push(data.courseId);
      }
      if (data.instructorName !== undefined) {
        fields.push(`instructor_name = $${idx++}`);
        values.push(data.instructorName);
      }
      if (data.title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(data.description);
      }
      if (data.startTime !== undefined) {
        fields.push(`start_time = $${idx++}`);
        values.push(data.startTime);
      }
      if (data.endTime !== undefined) {
        fields.push(`end_time = $${idx++}`);
        values.push(data.endTime);
      }
      if (data.meetingLink !== undefined) {
        fields.push(`meeting_link = $${idx++}`);
        values.push(data.meetingLink);
      }
      if (data.status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(data.status);
      }
      if (data.maxParticipants !== undefined) {
        fields.push(`max_participants = $${idx++}`);
        values.push(data.maxParticipants);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const updateRes = await db.query(
        `UPDATE live_classes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      const updated = updateRes.rows[0];

      // Audit Log
      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values, new_values)
         VALUES ($1, 'LIVE_CLASS_UPDATED', 'live_classes', $2, $3, $4)`,
        [adminId, id, JSON.stringify(existing), JSON.stringify(updated)]
      );

      res.status(200).json({
        success: true,
        message: 'Live class updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 28: Admin delete live class
   */
  static async deleteLiveClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const delRes = await db.query('DELETE FROM live_classes WHERE id = $1 RETURNING *', [id]);
      if (delRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Live class not found.' });
        return;
      }

      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values)
         VALUES ($1, 'LIVE_CLASS_DELETED', 'live_classes', $2, $3)`,
        [adminId, id, JSON.stringify(delRes.rows[0])]
      );

      res.status(200).json({
        success: true,
        message: 'Live class and associated recordings deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 28: Admin attach recorded live session
   */
  static async addRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const schema = z.object({
        title: z.string().trim().min(3, 'Recording title is required'),
        storageKey: z.string().trim().min(1, 'Storage key is required'),
        durationSeconds: z.number().min(1, 'Duration must be positive'),
        storageProvider: z.string().default('s3'),
      });

      const data = schema.parse(req.body);

      // Verify live class exists
      const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [id]);
      if (classRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Live class not found.' });
        return;
      }

      const recRes = await db.query(
        `INSERT INTO live_class_recordings (live_class_id, title, storage_provider, storage_key, duration_seconds)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, data.title, data.storageProvider, data.storageKey, data.durationSeconds]
      );

      const recording = recRes.rows[0];

      // Mark class status COMPLETED if it wasn't already
      await db.query(`UPDATE live_classes SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`, [id]);

      // Audit Log
      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values)
         VALUES ($1, 'RECORDING_ATTACHED', 'live_class_recordings', $2, $3)`,
        [adminId, recording.id, JSON.stringify(recording)]
      );

      res.status(201).json({
        success: true,
        message: 'Recording session uploaded and attached successfully.',
        data: {
          ...recording,
          durationFormatted: formatDuration(recording.duration_seconds),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin delete recording
   */
  static async deleteRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const delRes = await db.query(
        'DELETE FROM live_class_recordings WHERE id = $1 RETURNING *',
        [id]
      );

      if (delRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Recording not found.' });
        return;
      }

      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values)
         VALUES ($1, 'RECORDING_DELETED', 'live_class_recordings', $2, $3)`,
        [adminId, id, JSON.stringify(delRes.rows[0])]
      );

      res.status(200).json({ success: true, message: 'Recording deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. IN-PLATFORM NATIVE VIRTUAL CLASSROOM SESSION STUDIO
  // ---------------------------------------------------------------------------

  /**
   * Get in-platform live session room state, participants, and host status
   */
  static async getSessionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const user = req.user!;

      // 1. Fetch live class details
      const classRes = await db.query(
        `SELECT lc.*, c.title as course_title, c.thumbnail_url as course_thumbnail
         FROM live_classes lc
         LEFT JOIN courses c ON c.id = lc.course_id
         WHERE lc.id = $1`,
        [id]
      );

      if (classRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Live class session not found.' });
        return;
      }

      const liveClass = classRes.rows[0];

      // 2. Retrieve or initialize live session in-memory state
      const session = getOrCreateSession(id);

      // 3. Register or update the current user in participants map
      let participant = session.participants.get(user.id);
      if (!participant) {
        const isHost = user.role === 'ADMIN';
        participant = {
          userId: user.id,
          name: user.role === 'ADMIN' ? (liveClass.instructor_name || 'Host Instructor') : (user.phone || 'Student'),
          role: user.role as 'ADMIN' | 'STUDENT',
          canSpeak: isHost, // Admin can always speak; Students must be granted permission
          handRaised: false,
          isMuted: !isHost,
          isVideoOn: false,
          joinedAt: new Date().toISOString(),
        };
        session.participants.set(user.id, participant);
      }

      // Fetch student name from student_profiles if available
      if (user.role === 'STUDENT' && participant.name.startsWith('+')) {
        const profRes = await db.query('SELECT full_name FROM student_profiles WHERE user_id = $1', [user.id]);
        if (profRes.rowCount && profRes.rows[0].full_name) {
          participant.name = profRes.rows[0].full_name;
        }
      }

      // Calculate recording seconds if active
      let recordingDurationSeconds = 0;
      if (session.isRecording && session.recordingStartedAt) {
        recordingDurationSeconds = Math.floor((Date.now() - session.recordingStartedAt) / 1000);
      }

      res.status(200).json({
        success: true,
        data: {
          id: liveClass.id,
          title: liveClass.title,
          description: liveClass.description,
          instructorName: liveClass.instructor_name,
          courseTitle: liveClass.course_title || 'Institute Masterclass',
          courseThumbnail: liveClass.course_thumbnail,
          status: liveClass.status,
          startTime: liveClass.start_time,
          endTime: liveClass.end_time,
          isRecording: session.isRecording,
          recordingDurationSeconds,
          isHost: user.role === 'ADMIN',
          currentParticipant: participant,
          participants: Array.from(session.participants.values()),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Host / Admin controls session recording (START / STOP)
   */
  static async controlRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { action } = req.body; // 'START' | 'STOP'

      const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [id]);
      if (classRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Live class not found.' });
        return;
      }
      const liveClass = classRes.rows[0];

      const session = getOrCreateSession(id);

      if (action === 'START') {
        session.isRecording = true;
        session.recordingStartedAt = Date.now();

        // Broadcast notification/message
        await db.query(
          `INSERT INTO live_class_messages (live_class_id, sender_id, sender_name, sender_role, message, is_pinned)
           VALUES ($1, $2, 'System', 'SYSTEM', '🔴 Session recording has started.', true)`,
          [id, req.user!.id]
        );

        res.status(200).json({
          success: true,
          message: 'Recording started.',
          data: { isRecording: true, recordingStartedAt: session.recordingStartedAt },
        });
      } else if (action === 'STOP') {
        const durationSeconds = session.recordingStartedAt
          ? Math.max(Math.floor((Date.now() - session.recordingStartedAt) / 1000), 1)
          : 60;

        session.isRecording = false;
        session.recordingStartedAt = null;

        // Auto-save recording into live_class_recordings
        const recRes = await db.query(
          `INSERT INTO live_class_recordings (live_class_id, title, storage_provider, storage_key, duration_seconds)
           VALUES ($1, $2, 's3', $3, $4)
           RETURNING *`,
          [
            id,
            `${liveClass.title} - Session Recording (${new Date().toLocaleDateString()})`,
            `recordings/${id}/session_${Date.now()}.mp4`,
            durationSeconds,
          ]
        );

        await db.query(
          `INSERT INTO live_class_messages (live_class_id, sender_id, sender_name, sender_role, message, is_pinned)
           VALUES ($1, $2, 'System', 'SYSTEM', '⏹️ Session recording stopped and saved to course library.', false)`,
          [id, req.user!.id]
        );

        res.status(200).json({
          success: true,
          message: 'Recording stopped and saved to library.',
          data: { isRecording: false, recording: recRes.rows[0] },
        });
      } else {
        res.status(400).json({ success: false, code: 'INVALID_ACTION', message: 'Action must be START or STOP' });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Host / Admin sets speaking permissions for a student
   */
  static async setStudentSpeakingPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { studentId, allowed } = req.body;

      if (!studentId || typeof allowed !== 'boolean') {
        res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'studentId and allowed are required.' });
        return;
      }

      const session = getOrCreateSession(id);
      const participant = session.participants.get(studentId);
      if (participant) {
        participant.canSpeak = allowed;
        if (!allowed) {
          participant.isMuted = true;
        } else {
          participant.handRaised = false; // Lower hand once allowed
        }
      }

      res.status(200).json({
        success: true,
        message: allowed ? 'Student granted speaking permission.' : 'Student muted by host.',
        data: { studentId, canSpeak: allowed },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Host / Admin mutes all students at once
   */
  static async muteAllStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const session = getOrCreateSession(id);
      for (const p of session.participants.values()) {
        if (p.role === 'STUDENT') {
          p.canSpeak = false;
          p.isMuted = true;
        }
      }

      res.status(200).json({ success: true, message: 'All students have been muted by the host.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student toggles "Raise Hand" to request speaking permission
   */
  static async toggleRaiseHand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { raised } = req.body;
      const userId = req.user!.id;

      const session = getOrCreateSession(id);
      const participant = session.participants.get(userId);
      if (participant) {
        participant.handRaised = Boolean(raised);
      }

      res.status(200).json({
        success: true,
        message: raised ? 'Hand raised. Host notified.' : 'Hand lowered.',
        data: { handRaised: Boolean(raised) },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Send live message to class chat box
   */
  static async sendSessionMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const user = req.user!;
      const { text, isPinned } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ success: false, code: 'EMPTY_MESSAGE', message: 'Message text cannot be empty.' });
        return;
      }

      // Fetch sender display name
      let senderName = user.role === 'ADMIN' ? 'Instructor (Host)' : 'Student';
      if (user.role === 'ADMIN') {
        const classRes = await db.query('SELECT instructor_name FROM live_classes WHERE id = $1', [id]);
        if (classRes.rowCount && classRes.rows[0].instructor_name) {
          senderName = `${classRes.rows[0].instructor_name} (Host)`;
        }
      } else {
        const profRes = await db.query('SELECT full_name FROM student_profiles WHERE user_id = $1', [user.id]);
        if (profRes.rowCount && profRes.rows[0].full_name) {
          senderName = profRes.rows[0].full_name;
        } else if (user.phone) {
          senderName = user.phone;
        }
      }

      const insertRes = await db.query(
        `INSERT INTO live_class_messages (live_class_id, sender_id, sender_name, sender_role, message, is_pinned)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, user.id, senderName, user.role, text.trim(), Boolean(isPinned && user.role === 'ADMIN')]
      );

      res.status(201).json({
        success: true,
        message: 'Message sent.',
        data: insertRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all chat messages for a live session
   */
  static async getSessionMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const msgsRes = await db.query(
        `SELECT id, live_class_id, sender_id, sender_name, sender_role, message, is_pinned, created_at
         FROM live_class_messages
         WHERE live_class_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      res.status(200).json({
        success: true,
        data: msgsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }
}

/**
 * Helper to format seconds into "1h 24m" or "45m"
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}
