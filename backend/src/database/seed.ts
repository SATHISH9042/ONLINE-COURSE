import { db } from './db';
import { hashPassword } from '../utils/password';

export async function seedDatabase() {
  console.log('[Seed] Checking and seeding default records...');

  const adminPhone = '+919999999999';
  const adminEmail = 'admin@institute.edu';
  const adminPass = 'Admin@123';

  let adminId = '';

  const existing = await db.query(
    'SELECT id FROM users WHERE phone = $1 OR email = $2',
    [adminPhone, adminEmail]
  );

  if (existing.rowCount === 0) {
    const passwordHash = await hashPassword(adminPass);

    // Create admin user
    const userRes = await db.query(
      `INSERT INTO users (phone, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
       RETURNING id`,
      [adminPhone, adminEmail, passwordHash]
    );

    adminId = userRes.rows[0].id;

    // Create admin profile
    await db.query(
      `INSERT INTO admin_profiles (user_id, full_name, department)
       VALUES ($1, $2, $3)`,
      [adminId, 'Institute Administrator', 'Academic Administration']
    );

    console.log('[Seed] Default administrator created:');
    console.log(`       Email:    ${adminEmail}`);
    console.log(`       Phone:    ${adminPhone}`);
    console.log(`       Password: ${adminPass}`);
  } else {
    adminId = existing.rows[0].id;
    console.log('[Seed] Administrator already exists. Skipping admin creation.');
  }

  // 1. Seed sample courses if none exist
  const coursesCheck = await db.query('SELECT id FROM courses LIMIT 1');
  let fullStackCourseId = '';
  let javaCourseId = '';

  if (coursesCheck.rowCount === 0) {
    console.log('[Seed] Seeding sample courses and syllabus...');

    // Course 1: Full Stack Development
    const c1 = await db.query(
      `INSERT INTO courses (title, slug, short_description, description, thumbnail_url, price, currency, duration_hours, instructor_name, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, $8, TRUE, 1)
       RETURNING id`,
      [
        'Full Stack Web Development',
        'full-stack-web-development',
        'Master React, Node.js, Express, and PostgreSQL with real-world industry projects.',
        'A comprehensive hands-on boot camp covering modern frontend and backend development, database design, REST APIs, authentication, and cloud deployment.',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
        9999.0,
        120,
        'Dr. Rajesh Verma',
      ]
    );
    fullStackCourseId = c1.rows[0].id;

    // Course 1 -> Topic 1: JavaScript Foundations
    const t1 = await db.query(
      `INSERT INTO course_topics (course_id, title, description, sort_order)
       VALUES ($1, 'JavaScript Architecture', 'Core language mechanics, runtime engine, and asynchronous programming.', 1)
       RETURNING id`,
      [fullStackCourseId]
    );
    const topic1Id = t1.rows[0].id;

    // Subtopic 1.1: Introduction & Variables
    const s1 = await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'Introduction & Variables', 1)
       RETURNING id`,
      [topic1Id]
    );
    // Subtopic 1.2: Functions & Closures (matching Section 7 example!)
    const s2 = await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'Functions & Closures', 2)
       RETURNING id`,
      [topic1Id]
    );
    // Subtopic 1.3: Asynchronous JS & Promises
    await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'Asynchronous JS & Promises', 3)`,
      [topic1Id]
    );

    // Course 1 -> Topic 2: React.js Modern Frontend
    const t2 = await db.query(
      `INSERT INTO course_topics (course_id, title, description, sort_order)
       VALUES ($1, 'React Modern Frontend', 'Component lifecycle, hooks, context API, and high-performance UI rendering.', 2)
       RETURNING id`,
      [fullStackCourseId]
    );
    const topic2Id = t2.rows[0].id;

    await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'Components, Props & JSX', 1)`,
      [topic2Id]
    );
    await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'State & Effect Hooks', 2)`,
      [topic2Id]
    );

    // Course 2: Java Full Stack Development (matching Section 8 example!)
    const c2 = await db.query(
      `INSERT INTO courses (title, slug, short_description, description, thumbnail_url, price, currency, duration_hours, instructor_name, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, $8, TRUE, 2)
       RETURNING id`,
      [
        'Java Full Stack Development',
        'java-full-stack-development',
        'Enterprise backend architecture with Spring Boot, Hibernate, microservices, and React.',
        'Deep dive into Java 21, Spring Boot, Spring Security, Docker, and PostgreSQL microservices.',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
        14999.0,
        150,
        'Prof. Ananya Iyer',
      ]
    );
    javaCourseId = c2.rows[0].id;

    const jt1 = await db.query(
      `INSERT INTO course_topics (course_id, title, description, sort_order)
       VALUES ($1, 'Core Java Fundamentals', 'OOP concepts, Generics, Collections, and Concurrency.', 1)
       RETURNING id`,
      [javaCourseId]
    );
    await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'Object-Oriented Design', 1)`,
      [jt1.rows[0].id]
    );
    await db.query(
      `INSERT INTO course_subtopics (topic_id, title, sort_order)
       VALUES ($1, 'Collections Framework', 2)`,
      [jt1.rows[0].id]
    );

    console.log('[Seed] Sample courses created.');
  }

  // 2. Seed an ACTIVE sample student enrolled in courses to test Student Dashboard immediately
  const activeStudentPhone = '+919888877777';
  const activeStudentEmail = 'priya.patel@example.com';
  const activeStudentCheck = await db.query(
    'SELECT id FROM users WHERE phone = $1 OR email = $2',
    [activeStudentPhone, activeStudentEmail]
  );

  let studentUserId = '';
  if (activeStudentCheck.rowCount === 0) {
    const studentPass = await hashPassword('Student@123');
    const studentRes = await db.query(
      `INSERT INTO users (phone, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE')
       RETURNING id`,
      [activeStudentPhone, activeStudentEmail, studentPass]
    );
    studentUserId = studentRes.rows[0].id;

    await db.query(
      `INSERT INTO student_profiles (user_id, full_name, bio, city, state)
       VALUES ($1, 'Priya Patel', 'Aspiring software engineer excited to learn full-stack web engineering.', 'Bengaluru', 'Karnataka')`,
      [studentUserId]
    );

    console.log('[Seed] Sample ACTIVE student created:');
    console.log(`       Name:     Priya Patel`);
    console.log(`       Phone:    ${activeStudentPhone}`);
    console.log(`       Email:    ${activeStudentEmail}`);
    console.log(`       Password: Student@123`);
    console.log(`       Status:   ACTIVE`);

    // Enroll in the course if available
    const coursesRes = await db.query('SELECT id FROM courses ORDER BY sort_order ASC');
    if (coursesRes.rowCount > 0) {
      const course1 = coursesRes.rows[0].id;
      await db.query(
        `INSERT INTO course_enrollments (student_id, course_id, status)
         VALUES ($1, $2, 'ACTIVE')
         ON CONFLICT DO NOTHING`,
        [studentUserId, course1]
      );

      // Populate sample progress matching Section 7 ("Progress: 64%", "Functions & Closures")
      const subtopicsRes = await db.query(
        `SELECT cs.id, cs.title
         FROM course_subtopics cs
         JOIN course_topics ct ON ct.id = cs.topic_id
         WHERE ct.course_id = $1
         ORDER BY ct.sort_order ASC, cs.sort_order ASC`,
        [course1]
      );

      if (subtopicsRes.rowCount >= 2) {
        // Mark first subtopic completed
        await db.query(
          `INSERT INTO student_progress (student_id, subtopic_id, is_completed, completed_at, last_accessed_at)
           VALUES ($1, $2, TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
           ON CONFLICT DO NOTHING`,
          [studentUserId, subtopicsRes.rows[0].id]
        );

        // Mark second subtopic accessed recently (Functions & Closures)
        await db.query(
          `INSERT INTO student_progress (student_id, subtopic_id, is_completed, last_accessed_at)
           VALUES ($1, $2, FALSE, NOW())
           ON CONFLICT DO NOTHING`,
          [studentUserId, subtopicsRes.rows[1].id]
        );
      }
    }
  }

  // 3. Seed an upcoming Live Class if none exist
  const liveClassCheck = await db.query('SELECT id FROM live_classes LIMIT 1');
  if (liveClassCheck.rowCount === 0) {
    const courseRes = await db.query('SELECT id FROM courses LIMIT 1');
    const courseId = courseRes.rowCount > 0 ? courseRes.rows[0].id : null;

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    startTime.setHours(19, 0, 0, 0); // 7:00 PM

    const endTime = new Date(startTime);
    endTime.setHours(20, 30, 0, 0); // 8:30 PM

    await db.query(
      `INSERT INTO live_classes (course_id, instructor_name, title, description, start_time, end_time, meeting_link, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'UPCOMING')`,
      [
        courseId,
        'Dr. Rajesh Verma',
        'JavaScript Live Masterclass: Closures & Scope Chain',
        'Interactive live coding session deep-diving into execution contexts, closures, and memory optimization.',
        startTime.toISOString(),
        endTime.toISOString(),
        'https://meet.jit.si/ApexInstitute_JS_Live_Masterclass',
      ]
    );
    console.log('[Seed] Sample upcoming live class created.');
  }

  // 4. Seed FAQs if none exist
  const faqCheck = await db.query('SELECT id FROM faqs LIMIT 1');
  if (faqCheck.rowCount === 0) {
    const faqs = [
      {
        category: 'Course Access',
        question: 'When will my course become accessible after registration?',
        answer: 'All new student registrations require verification by an administrator. Once approved, you can log in, browse all courses, and immediately start enrolled lessons.',
      },
      {
        category: 'Learning & Video',
        question: 'Can I resume videos from where I left off?',
        answer: 'Yes! The platform tracks your exact playback position across desktop, tablet, and mobile devices so you can pick up precisely where you stopped.',
      },
      {
        category: 'Live Classes',
        question: 'How do I join scheduled live classes?',
        answer: 'Navigate to the Live Classes section in your sidebar. When a session is scheduled and live, click "Join Class" to access the virtual classroom.',
      },
      {
        category: 'Payments',
        question: 'Which payment methods are accepted for course purchases?',
        answer: 'We support all major payment methods via Razorpay (UPI, Credit/Debit cards, Net Banking) as well as direct institutional QR code payments verified by the administrative team.',
      },
    ];

    for (const faq of faqs) {
      await db.query(
        `INSERT INTO faqs (category, question, answer, sort_order, is_published)
         VALUES ($1, $2, $3, 1, TRUE)`,
        [faq.category, faq.question, faq.answer]
      );
    }
    console.log('[Seed] Sample FAQs created.');
  }

  // 5. Seed learning content (Videos, Coding Problems, MCQs) for first course if none exist
  const subtopics = await db.query(
    `SELECT cs.id, cs.title FROM course_subtopics cs ORDER BY cs.sort_order ASC`
  );
  if (subtopics.rowCount > 0) {
    const st1 = subtopics.rows[0].id;
    const st1VideoCheck = await db.query('SELECT COUNT(*) AS count FROM videos WHERE subtopic_id = $1', [st1]);
    if (parseInt(st1VideoCheck.rows[0].count, 10) === 0) {
      // Video
      await db.query(
        `INSERT INTO videos (subtopic_id, title, description, storage_provider, storage_key, duration_seconds, sort_order)
         VALUES ($1, 'Deep Dive into Execution Contexts & Memory', 'Master the JavaScript call stack, execution context phases, and memory allocation.', 's3', 'courses/js/context.mp4', 1080, 1)`,
        [st1]
      );

      // Coding Problem
      const cp1 = await db.query(
        `INSERT INTO coding_problems (subtopic_id, title, description, input_format, output_format, constraints, default_code, allowed_languages, time_limit_ms, memory_limit_mb, sort_order)
         VALUES ($1, 'Sum of Array Numbers', 'Given an array of integers encoded in input string, calculate and print the sum of all elements.', 'Space-separated integers: e.g. "1 2 3 4 5"', 'Single integer sum: e.g. 15', '1 <= N <= 10^5, -10^9 <= A[i] <= 10^9', $2, ARRAY['javascript', 'python'], 2000, 128, 1)
         RETURNING id`,
        [
          st1,
          JSON.stringify({
            javascript: '// Use input (string) to process input data\nconst numbers = input.trim().split(/\\s+/).map(Number);\nconst sum = numbers.reduce((acc, curr) => acc + curr, 0);\nconsole.log(sum);',
            python: 'import sys\nraw = sys.stdin.read().strip()\nif raw:\n    nums = [int(x) for x in raw.split()]\n    print(sum(nums))\nelse:\n    print(0)',
          }),
        ]
      );

      const probId1 = cp1.rows[0].id;
      // Test cases (public and hidden)
      await db.query(
        `INSERT INTO coding_test_cases (problem_id, input_data, expected_output, is_hidden, sort_order)
         VALUES ($1, '1 2 3 4 5', '15', FALSE, 1),
                ($1, '10 -5 20', '25', FALSE, 2),
                ($1, '100 200 -50 25', '275', TRUE, 3)`,
        [probId1]
      );

      // MCQs
      const mcq1 = await db.query(
        `INSERT INTO mcq_questions (subtopic_id, question_text, explanation, points, sort_order)
         VALUES ($1, 'Which keyword is used to declare a constant in modern JavaScript?', 'The const keyword creates block-scoped constants that cannot be reassigned.', 1, 1)
         RETURNING id`,
        [st1]
      );
      await db.query(
        `INSERT INTO mcq_options (question_id, option_text, is_correct, sort_order)
         VALUES ($1, 'var', FALSE, 1),
                ($1, 'let', FALSE, 2),
                ($1, 'const', TRUE, 3),
                ($1, 'static', FALSE, 4)`,
        [mcq1.rows[0].id]
      );

      const mcq2 = await db.query(
        `INSERT INTO mcq_questions (subtopic_id, question_text, explanation, points, sort_order)
         VALUES ($1, 'What is the return type of typeof NaN in JavaScript?', 'In JavaScript, NaN (Not-a-Number) is officially typed as a primitive numeric type according to IEEE 754 floating point standard.', 1, 2)
         RETURNING id`,
        [st1]
      );
      await db.query(
        `INSERT INTO mcq_options (question_id, option_text, is_correct, sort_order)
         VALUES ($1, 'undefined', FALSE, 1),
                ($1, 'number', TRUE, 2),
                ($1, 'NaN', FALSE, 3),
                ($1, 'object', FALSE, 4)`,
        [mcq2.rows[0].id]
      );

      if (subtopics.rowCount > 1) {
        const st2 = subtopics.rows[1].id;
        await db.query(
          `INSERT INTO videos (subtopic_id, title, description, storage_provider, storage_key, duration_seconds, sort_order)
           VALUES ($1, 'Mastering JavaScript Closures and Lexical Scope', 'Learn how lexical scoping and memory retention work under the hood.', 's3', 'courses/js/closures.mp4', 1440, 1)`,
          [st2]
        );
      }
      console.log('[Seed] Sample learning content (videos, coding problems, MCQs) created.');
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Seed Live Classes & Recordings (Phase 6)
  // ---------------------------------------------------------------------------
  const courseRes = await db.query('SELECT id FROM courses LIMIT 1');
  const courseId = courseRes.rowCount > 0 ? courseRes.rows[0].id : null;
  const now = new Date();

  // 1. LIVE now session if not present
  const liveRes = await db.query("SELECT COUNT(*) as count FROM live_classes WHERE status = 'LIVE'");
  if (parseInt(liveRes.rows[0].count, 10) === 0) {
    const liveStart = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
    const liveEnd = new Date(now.getTime() + 65 * 60 * 1000).toISOString();
    await db.query(
      `INSERT INTO live_classes (
         course_id, instructor_name, title, description, start_time, end_time, meeting_link, status, max_participants
       )
       VALUES ($1, 'Dr. Aris Thorne', 'Live Workshop: Real-Time Event Driven Architectures',
               'Interactive live architectural coding session building event streams with Kafka and WebSockets.',
               $2, $3, 'https://meet.google.com/xyz-live-arch', 'LIVE', 300)`,
      [courseId, liveStart, liveEnd]
    );
    console.log('[Seed] Live class with status LIVE created.');
  }

  // 2. UPCOMING session tomorrow if none
  const upcomingRes = await db.query("SELECT COUNT(*) as count FROM live_classes WHERE status = 'UPCOMING'");
  if (parseInt(upcomingRes.rows[0].count, 10) === 0) {
    const upcomingStart = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const upcomingEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString();
    await db.query(
      `INSERT INTO live_classes (
         course_id, instructor_name, title, description, start_time, end_time, meeting_link, status, max_participants
       )
       VALUES ($1, 'Prof. Elena Rostova', 'Database Indexing & PostgreSQL Performance Tuning',
               'Master B-Trees, GiST, query plan profiling with EXPLAIN ANALYZE, and connection pooling.',
               $2, $3, 'https://meet.google.com/db-perf-tune', 'UPCOMING', 250)`,
      [courseId, upcomingStart, upcomingEnd]
    );
    console.log('[Seed] Upcoming live class created.');
  }

  // 3. COMPLETED session with recording if none
  const recsRes = await db.query('SELECT COUNT(*) as count FROM live_class_recordings');
  if (parseInt(recsRes.rows[0].count, 10) === 0) {
    const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(now.getTime() - 46 * 60 * 60 * 1000).toISOString();
    const completedClass = await db.query(
      `INSERT INTO live_classes (
         course_id, instructor_name, title, description, start_time, end_time, meeting_link, status, max_participants
       )
       VALUES ($1, 'Prof. Elena Rostova', 'Full-Stack Security & OAuth2 Best Practices',
               'Deep-dive into token rotations, CSRF mitigation, PKCE flow, and zero-trust authentication.',
               $2, $3, 'https://meet.google.com/oauth2-live', 'COMPLETED', 200)
       RETURNING id`,
      [courseId, pastStart, pastEnd]
    );

    await db.query(
      `INSERT INTO live_class_recordings (live_class_id, title, storage_provider, storage_key, duration_seconds)
       VALUES ($1, 'Recording: OAuth2 Deep Dive & Security Architecture', 's3', 'recordings/oauth2-masterclass.mp4', 5040)`,
      [completedClass.rows[0].id]
    );

    console.log('[Seed] Completed Live Class with recorded session created.');
  }

  // ---------------------------------------------------------------------------
  // 6. Seed Sample Financial Payments & Ledger (Section 36)
  // ---------------------------------------------------------------------------
  const payCountRes = await db.query('SELECT COUNT(*) as count FROM payments');
  if (parseInt(payCountRes.rows[0].count, 10) < 10) {
    const studentUsersRes = await db.query("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 10");
    const allCoursesRes = await db.query('SELECT id, price, title FROM courses WHERE is_published = TRUE ORDER BY sort_order ASC');

    if (studentUsersRes.rowCount > 0 && allCoursesRes.rowCount > 0) {
      const studentIds = studentUsersRes.rows.map((s) => s.id);
      const courses = allCoursesRes.rows;

      const baseDate = new Date();
      let orderSeq = 1001;

      // Seed across past 10 months with diverse distribution
      for (let monthsAgo = 9; monthsAgo >= 0; monthsAgo--) {
        const ordersInMonth = 2 + (9 - monthsAgo); // gradual growth from 2 to 11 orders
        const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - monthsAgo, 1);
        const yStr = targetDate.getFullYear();
        const mStr = String(targetDate.getMonth() + 1).padStart(2, '0');

        for (let j = 0; j < ordersInMonth; j++) {
          const studentId = studentIds[(orderSeq + j) % studentIds.length];
          const course = courses[(orderSeq * 2 + j) % courses.length];
          const day = Math.min(2 + j * 2 + (orderSeq % 4), 28);
          const orderDate = new Date(yStr, targetDate.getMonth(), day, 10 + (j % 8), 20 + (j * 3) % 40);

          let method = 'RAZORPAY';
          if (j % 3 === 1) method = 'QR_CODE';
          else if (j % 5 === 0) method = 'MANUAL_BANK_TRANSFER';

          const status = method === 'RAZORPAY' ? 'SUCCESS' : 'MANUALLY_VERIFIED';
          const orderId = `ORD-${yStr}-${mStr}-${orderSeq}`;
          const paymentId = `pay_${yStr}${mStr}_${orderSeq}`;

          await db.query(
            `INSERT INTO payments (
               student_id, course_id, amount, currency, status, payment_method,
               order_id, payment_id, created_at, verified_at
             )
             VALUES ($1, $2, $3, 'INR', $4, $5, $6, $7, $8, $8)`,
            [
              studentId,
              course.id,
              course.price,
              status,
              method,
              orderId,
              paymentId,
              orderDate.toISOString(),
            ]
          );

          orderSeq++;
        }
      }
      console.log('[Seed] Authentic non-duplicate historical payment ledger created.');
    }
  }

  console.log('[Seed] Database seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
