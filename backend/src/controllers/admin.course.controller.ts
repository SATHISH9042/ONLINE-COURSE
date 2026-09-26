import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { z } from 'zod';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class AdminCourseController {
  // ---------------------------------------------------------------------------
  // 1. COURSE CRUD
  // ---------------------------------------------------------------------------

  static async listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coursesRes = await db.query(
        `SELECT c.id, c.title, c.slug, c.short_description, c.thumbnail_url, c.price, c.currency,
                c.duration_hours, c.instructor_name, c.is_published, c.created_at, c.updated_at,
                (SELECT COUNT(DISTINCT ct.id) FROM course_topics ct WHERE ct.course_id = c.id) as topic_count,
                (SELECT COUNT(cs.id) FROM course_subtopics cs JOIN course_topics ct ON ct.id = cs.topic_id WHERE ct.course_id = c.id) as subtopic_count,
                (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = 'ACTIVE') as enrollment_count
         FROM courses c
         WHERE c.deleted_at IS NULL
         ORDER BY c.sort_order ASC, c.created_at DESC`
      );

      res.status(200).json({
        success: true,
        data: coursesRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCourseDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const courseRes = await db.query(
        'SELECT * FROM courses WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (courseRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found.',
        });
        return;
      }

      const course = courseRes.rows[0];

      // Fetch topics with nested subtopics and learning activities
      const topicsRes = await db.query(
        'SELECT * FROM course_topics WHERE course_id = $1 ORDER BY sort_order ASC, created_at ASC',
        [id]
      );

      const topics = [];
      for (const topic of topicsRes.rows) {
        const subtopicsRes = await db.query(
          'SELECT * FROM course_subtopics WHERE topic_id = $1 ORDER BY sort_order ASC, created_at ASC',
          [topic.id]
        );

        const subtopics = [];
        for (const sub of subtopicsRes.rows) {
          // Fetch videos
          const videosRes = await db.query(
            'SELECT * FROM videos WHERE subtopic_id = $1 ORDER BY sort_order ASC',
            [sub.id]
          );

          // Fetch coding problems
          const codingRes = await db.query(
            'SELECT * FROM coding_problems WHERE subtopic_id = $1 ORDER BY sort_order ASC',
            [sub.id]
          );

          // Fetch MCQs
          const mcqsRes = await db.query(
            `SELECT mq.*, 
                    COALESCE(json_agg(json_build_object('id', mo.id, 'text', mo.option_text, 'is_correct', mo.is_correct, 'sort_order', mo.sort_order) ORDER BY mo.sort_order ASC) FILTER (WHERE mo.id IS NOT NULL), '[]'::json) as options
             FROM mcq_questions mq
             LEFT JOIN mcq_options mo ON mo.question_id = mq.id
             WHERE mq.subtopic_id = $1
             GROUP BY mq.id
             ORDER BY mq.sort_order ASC`,
            [sub.id]
          );

          subtopics.push({
            ...sub,
            videos: videosRes.rows,
            codingProblems: codingRes.rows,
            mcqs: mcqsRes.rows,
          });
        }

        topics.push({
          ...topic,
          subtopics,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...course,
          topics,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const schema = z.object({
        title: z.string().trim().min(3).max(255),
        shortDescription: z.string().trim().min(10),
        description: z.string().trim().min(20),
        thumbnailUrl: z.string().trim().url().optional().or(z.literal('')),
        price: z.number().min(0).default(0),
        currency: z.string().default('INR'),
        durationHours: z.number().min(0).default(0),
        instructorName: z.string().trim().min(2),
        isPublished: z.boolean().default(false),
      });

      const data = schema.parse(req.body);
      let baseSlug = slugify(data.title);
      let uniqueSlug = baseSlug;
      let counter = 1;

      // Ensure slug uniqueness
      while (true) {
        const slugCheck = await db.query('SELECT id FROM courses WHERE slug = $1', [uniqueSlug]);
        if (slugCheck.rowCount === 0) break;
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      const defaultThumb =
        data.thumbnailUrl ||
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';

      const courseRes = await db.transaction(async (tx) => {
        const insertRes = await tx.query(
          `INSERT INTO courses (title, slug, short_description, description, thumbnail_url, price, currency, duration_hours, instructor_name, is_published)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            data.title,
            uniqueSlug,
            data.shortDescription,
            data.description,
            defaultThumb,
            data.price,
            data.currency,
            data.durationHours,
            data.instructorName,
            data.isPublished,
          ]
        );

        // Section 33: Audit log
        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values, ip_address, user_agent)
           VALUES ($1, 'COURSE_CREATED', 'courses', $2, $3, $4, $5)`,
          [
            adminId,
            insertRes.rows[0].id,
            JSON.stringify(insertRes.rows[0]),
            req.ip || '127.0.0.1',
            req.headers['user-agent'] || 'AdminConsole',
          ]
        );

        return insertRes.rows[0];
      });

      res.status(201).json({
        success: true,
        message: 'Course created successfully.',
        data: courseRes,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const schema = z.object({
        title: z.string().trim().min(3).max(255).optional(),
        shortDescription: z.string().trim().min(10).optional(),
        description: z.string().trim().min(20).optional(),
        thumbnailUrl: z.string().trim().url().optional().or(z.literal('')),
        price: z.number().min(0).optional(),
        currency: z.string().optional(),
        durationHours: z.number().min(0).optional(),
        instructorName: z.string().trim().min(2).optional(),
        isPublished: z.boolean().optional(),
      });

      const data = schema.parse(req.body);

      const existingRes = await db.query(
        'SELECT * FROM courses WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found.',
        });
        return;
      }

      const oldCourse = existingRes.rows[0];

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(data.title);
      }
      if (data.shortDescription !== undefined) {
        fields.push(`short_description = $${idx++}`);
        values.push(data.shortDescription);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(data.description);
      }
      if (data.thumbnailUrl !== undefined) {
        fields.push(`thumbnail_url = $${idx++}`);
        values.push(data.thumbnailUrl);
      }
      if (data.price !== undefined) {
        fields.push(`price = $${idx++}`);
        values.push(data.price);
      }
      if (data.durationHours !== undefined) {
        fields.push(`duration_hours = $${idx++}`);
        values.push(data.durationHours);
      }
      if (data.instructorName !== undefined) {
        fields.push(`instructor_name = $${idx++}`);
        values.push(data.instructorName);
      }
      if (data.isPublished !== undefined) {
        fields.push(`is_published = $${idx++}`);
        values.push(data.isPublished);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const updatedCourse = await db.transaction(async (tx) => {
        const updateRes = await tx.query(
          `UPDATE courses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        );

        // Audit log action
        const action = data.price !== undefined && data.price !== oldCourse.price
          ? 'COURSE_PRICE_CHANGED'
          : 'COURSE_UPDATED';

        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, $2, 'courses', $3, $4, $5, $6, $7)`,
          [
            adminId,
            action,
            id,
            JSON.stringify(oldCourse),
            JSON.stringify(updateRes.rows[0]),
            req.ip || '127.0.0.1',
            req.headers['user-agent'] || 'AdminConsole',
          ]
        );

        return updateRes.rows[0];
      });

      res.status(200).json({
        success: true,
        message: 'Course updated successfully.',
        data: updatedCourse,
      });
    } catch (err) {
      next(err);
    }
  }

  static async togglePublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const courseRes = await db.query(
        'SELECT is_published FROM courses WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (courseRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Course not found.' });
        return;
      }

      const nextStatus = !courseRes.rows[0].is_published;

      const updated = await db.query(
        'UPDATE courses SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, is_published',
        [nextStatus, id]
      );

      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values, ip_address, user_agent)
         VALUES ($1, 'COURSE_PUBLISH_TOGGLED', 'courses', $2, $3, $4, $5)`,
        [
          adminId,
          id,
          JSON.stringify({ is_published: nextStatus }),
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || 'AdminConsole',
        ]
      );

      res.status(200).json({
        success: true,
        message: `Course ${nextStatus ? 'published' : 'unpublished'} successfully.`,
        data: updated.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const updateRes = await db.query(
        'UPDATE courses SET deleted_at = NOW(), is_published = FALSE WHERE id = $1 AND deleted_at IS NULL RETURNING id, title',
        [id]
      );

      if (updateRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Course not found.' });
        return;
      }

      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, ip_address, user_agent)
         VALUES ($1, 'COURSE_DELETED', 'courses', $2, $3, $4)`,
        [adminId, id, req.ip || '127.0.0.1', req.headers['user-agent'] || 'AdminConsole']
      );

      res.status(200).json({
        success: true,
        message: 'Course archived successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. TOPICS CRUD
  // ---------------------------------------------------------------------------

  static async createTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId } = req.params;
      const schema = z.object({
        title: z.string().trim().min(2).max(255),
        description: z.string().trim().optional(),
        sortOrder: z.number().optional(),
      });

      const data = schema.parse(req.body);

      // Determine next sort order if omitted
      let sortOrder = data.sortOrder;
      if (sortOrder === undefined) {
        const countRes = await db.query(
          'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM course_topics WHERE course_id = $1',
          [courseId]
        );
        sortOrder = countRes.rows[0].next_order;
      }

      const topicRes = await db.query(
        `INSERT INTO course_topics (course_id, title, description, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [courseId, data.title, data.description || null, sortOrder]
      );

      res.status(201).json({
        success: true,
        message: 'Topic created successfully.',
        data: topicRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        title: z.string().trim().min(2).max(255).optional(),
        description: z.string().trim().optional(),
        sortOrder: z.number().optional(),
      });

      const data = schema.parse(req.body);
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(data.description);
      }
      if (data.sortOrder !== undefined) {
        fields.push(`sort_order = $${idx++}`);
        values.push(data.sortOrder);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const topicRes = await db.query(
        `UPDATE course_topics SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (topicRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Topic not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Topic updated successfully.',
        data: topicRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const delRes = await db.query('DELETE FROM course_topics WHERE id = $1 RETURNING id', [id]);

      if (delRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Topic not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Topic deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SUBTOPICS CRUD
  // ---------------------------------------------------------------------------

  static async createSubtopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { topicId } = req.params;
      const schema = z.object({
        title: z.string().trim().min(2).max(255),
        sortOrder: z.number().optional(),
      });

      const data = schema.parse(req.body);

      let sortOrder = data.sortOrder;
      if (sortOrder === undefined) {
        const countRes = await db.query(
          'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM course_subtopics WHERE topic_id = $1',
          [topicId]
        );
        sortOrder = countRes.rows[0].next_order;
      }

      const subtopicRes = await db.query(
        `INSERT INTO course_subtopics (topic_id, title, sort_order)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [topicId, data.title, sortOrder]
      );

      res.status(201).json({
        success: true,
        message: 'Subtopic created successfully.',
        data: subtopicRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSubtopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        title: z.string().trim().min(2).max(255).optional(),
        sortOrder: z.number().optional(),
      });

      const data = schema.parse(req.body);
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(data.title);
      }
      if (data.sortOrder !== undefined) {
        fields.push(`sort_order = $${idx++}`);
        values.push(data.sortOrder);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const subtopicRes = await db.query(
        `UPDATE course_subtopics SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (subtopicRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Subtopic not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Subtopic updated successfully.',
        data: subtopicRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSubtopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const delRes = await db.query('DELETE FROM course_subtopics WHERE id = $1 RETURNING id', [id]);

      if (delRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Subtopic not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Subtopic deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. LEARNING CONTENT: VIDEOS
  // ---------------------------------------------------------------------------

  static async createVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subtopicId } = req.params;
      const schema = z.object({
        title: z.string().trim().min(2),
        description: z.string().trim().optional(),
        storageProvider: z.string().default('s3'),
        storageKey: z.string().trim().min(3),
        durationSeconds: z.number().min(0).default(0),
        isPreview: z.boolean().default(false),
      });

      const data = schema.parse(req.body);

      const videoRes = await db.query(
        `INSERT INTO videos (subtopic_id, title, description, storage_provider, storage_key, duration_seconds, is_preview)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          subtopicId,
          data.title,
          data.description || null,
          data.storageProvider,
          data.storageKey,
          data.durationSeconds,
          data.isPreview,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Video lesson added successfully.',
        data: videoRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM videos WHERE id = $1', [id]);
      res.status(200).json({ success: true, message: 'Video lesson deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. LEARNING CONTENT: CODING PROBLEMS
  // ---------------------------------------------------------------------------

  static async createCodingProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subtopicId } = req.params;
      const schema = z.object({
        title: z.string().trim().min(2),
        description: z.string().trim().min(10),
        inputFormat: z.string().optional(),
        outputFormat: z.string().optional(),
        constraints: z.string().optional(),
        defaultCode: z.record(z.string()).default({
          javascript: '// Write your solution here\nfunction solve(input) {\n  return input;\n}\n',
          python: '# Write your solution here\ndef solve(input):\n    return input\n',
        }),
        allowedLanguages: z.array(z.string()).default(['javascript', 'python']),
        timeLimitMs: z.number().min(500).default(2000),
        memoryLimitMb: z.number().min(32).default(128),
        testCases: z.array(
          z.object({
            inputData: z.string(),
            expectedOutput: z.string(),
            isHidden: z.boolean().default(false),
          })
        ).optional(),
      });

      const data = schema.parse(req.body);

      const problem = await db.transaction(async (tx) => {
        const probRes = await tx.query(
          `INSERT INTO coding_problems (subtopic_id, title, description, input_format, output_format, constraints, default_code, allowed_languages, time_limit_ms, memory_limit_mb)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            subtopicId,
            data.title,
            data.description,
            data.inputFormat || null,
            data.outputFormat || null,
            data.constraints || null,
            JSON.stringify(data.defaultCode),
            data.allowedLanguages,
            data.timeLimitMs,
            data.memoryLimitMb,
          ]
        );

        const problemId = probRes.rows[0].id;

        if (data.testCases && data.testCases.length > 0) {
          for (let i = 0; i < data.testCases.length; i++) {
            const tc = data.testCases[i];
            await tx.query(
              `INSERT INTO coding_test_cases (problem_id, input_data, expected_output, is_hidden, sort_order)
               VALUES ($1, $2, $3, $4, $5)`,
              [problemId, tc.inputData, tc.expectedOutput, tc.isHidden, i + 1]
            );
          }
        }

        return probRes.rows[0];
      });

      res.status(201).json({
        success: true,
        message: 'Coding problem created successfully.',
        data: problem,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCodingProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM coding_problems WHERE id = $1', [id]);
      res.status(200).json({ success: true, message: 'Coding problem deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. LEARNING CONTENT: MCQs
  // ---------------------------------------------------------------------------

  static async createMcqQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subtopicId } = req.params;
      const schema = z.object({
        questionText: z.string().trim().min(5),
        explanation: z.string().trim().optional(),
        points: z.number().min(1).default(1),
        options: z.array(
          z.object({
            optionText: z.string().trim().min(1),
            isCorrect: z.boolean().default(false),
          })
        ).min(2, 'At least 2 options are required for an MCQ'),
      });

      const data = schema.parse(req.body);

      // Validate that at least one option is marked correct
      const hasCorrect = data.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'At least one option must be marked as the correct answer.',
        });
        return;
      }

      const result = await db.transaction(async (tx) => {
        const qRes = await tx.query(
          `INSERT INTO mcq_questions (subtopic_id, question_text, explanation, points)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [subtopicId, data.questionText, data.explanation || null, data.points]
        );

        const questionId = qRes.rows[0].id;
        const insertedOptions = [];

        for (let i = 0; i < data.options.length; i++) {
          const opt = data.options[i];
          const optRes = await tx.query(
            `INSERT INTO mcq_options (question_id, option_text, is_correct, sort_order)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [questionId, opt.optionText, opt.isCorrect, i + 1]
          );
          insertedOptions.push(optRes.rows[0]);
        }

        return {
          ...qRes.rows[0],
          options: insertedOptions,
        };
      });

      res.status(201).json({
        success: true,
        message: 'MCQ question created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteMcqQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM mcq_questions WHERE id = $1', [id]);
      res.status(200).json({ success: true, message: 'MCQ question deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
}
