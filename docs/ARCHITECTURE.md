# Institute Learning Management Platform (LMS) - Complete Architecture Specification

## 1. Specification Analysis

The Institute Learning Management Platform is a production-grade, secure, multi-tenant-ready web application tailored for educational institutions. The platform caters to two core user archetypes:
* **Students**: Undergo self-registration, await administrator validation (`PENDING_APPROVAL`), and upon approval (`ACTIVE`), access a modern learning portal to browse/purchase courses, stream DRM/token-protected video content, execute code in interactive multi-language sandboxes, answer interactive MCQs, participate in scheduled live sessions, receive targeted push notifications, and monitor their academic progress.
* **Administrators**: Possess oversight of student lifecycles (approve, reject, suspend, reactivate), author structured course hierarchies (Course -> Topics -> Subtopics -> Videos / Coding / MCQs), schedule and archive live classes, verify Razorpay and manual QR payment transactions, broadcast segmented announcements, and audit all critical administrative operations.

---

## 2. Gap Analysis & Missing Requirements Identified

1. **Phone Number Internationalization & E.164 Normalization**: The specification mandates phone-based identity. Phone numbers must be validated and sanitized to standard E.164 format (`+919876543210`) to eliminate duplicates caused by inconsistent local prefixes (`0` or `+91` or none).
2. **Double-Purchase / Race Condition Protection**: When a student initiates multiple checkout tabs or when Razorpay fires duplicate webhook notifications, a database unique constraint on `(student_id, course_id, status)` prevents duplicate enrollments or double-charging.
3. **Zero-Amount / Promotional Enrollment**: The system must cleanly handle ₹0 free or scholarship courses by instantly creating an active enrollment without passing through payment gateway rejection.
4. **Token Revocation & Session Invalidation**: When an admin suspends a student or resets a credential, all active JWT sessions must be invalidated immediately via `token_version` tracking in the `users` table.
5. **Secure Code Execution Isolation**: Arbitrary student code submitted in the Coding Practice module must never run on the core application server. It must be executed in an isolated process sandbox with strict CPU, memory, and network execution quotas.
6. **Video Access Expiration**: Video storage URLs must not be static or guessable. Temporary HMAC-signed URLs with a 15-minute TTL bound to enrolled students ensure intellectual property protection.
7. **Audit Trail Completeness**: All mutations to student statuses, course prices, schedules, and manual payment approvals must record admin ID, IP address, user-agent, timestamp, and previous vs. updated JSON diffs.

---

## 3. Complete Database Schema (PostgreSQL DDL)

```sql
-- Core Schema for Institute LMS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerations
CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED');
CREATE TYPE enrollment_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'MANUALLY_VERIFIED');
CREATE TYPE payment_method AS ENUM ('RAZORPAY', 'QR_CODE', 'MANUAL_BANK_TRANSFER', 'FREE_ENROLLMENT');
CREATE TYPE live_class_status AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE submission_status AS ENUM ('ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR');
CREATE TYPE notification_type AS ENUM ('COURSE', 'LIVE_CLASS', 'PAYMENT', 'ANNOUNCEMENT', 'SYSTEM');
CREATE TYPE target_audience AS ENUM ('ALL', 'COURSE', 'SPECIFIC');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    status user_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    token_version INTEGER NOT NULL DEFAULT 1,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- 2. Student Profiles
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_profiles_user UNIQUE (user_id)
);

-- 3. Admin Profiles
CREATE TABLE admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) DEFAULT 'Academics',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_admin_profiles_user UNIQUE (user_id)
);

-- 4. Courses Table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    duration_hours INTEGER NOT NULL DEFAULT 0,
    instructor_name VARCHAR(150) NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_slug ON courses(slug);

-- 5. Course Topics
CREATE TABLE course_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_course_topics_course ON course_topics(course_id, sort_order);

-- 6. Course Subtopics
CREATE TABLE course_subtopics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_course_subtopics_topic ON course_subtopics(topic_id, sort_order);

-- 7. Videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtopic_id UUID NOT NULL REFERENCES course_subtopics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 's3',
    storage_key TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    is_preview BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_videos_subtopic ON videos(subtopic_id);

-- 8. Coding Problems
CREATE TABLE coding_problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtopic_id UUID NOT NULL REFERENCES course_subtopics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    default_code JSONB NOT NULL DEFAULT '{}'::jsonb,
    allowed_languages TEXT[] NOT NULL DEFAULT ARRAY['javascript', 'python', 'java', 'cpp'],
    time_limit_ms INTEGER NOT NULL DEFAULT 2000,
    memory_limit_mb INTEGER NOT NULL DEFAULT 128,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Coding Test Cases
CREATE TABLE coding_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_coding_test_cases_problem ON coding_test_cases(problem_id);

-- 10. MCQ Questions
CREATE TABLE mcq_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtopic_id UUID NOT NULL REFERENCES course_subtopics(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mcq_questions_subtopic ON mcq_questions(subtopic_id);

-- 11. MCQ Options
CREATE TABLE mcq_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_mcq_options_question ON mcq_options(question_id);

-- 12. Course Enrollments
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status enrollment_status NOT NULL DEFAULT 'ACTIVE',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_enrollment_student_course UNIQUE (student_id, course_id)
);
CREATE INDEX idx_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);

-- 13. Student Subtopic Progress
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subtopic_id UUID NOT NULL REFERENCES course_subtopics(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_progress_student_subtopic UNIQUE (student_id, subtopic_id)
);
CREATE INDEX idx_progress_student ON student_progress(student_id);

-- 14. Video Progress Tracking
CREATE TABLE video_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    watch_seconds INTEGER NOT NULL DEFAULT 0,
    last_position_seconds INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_video_progress_student UNIQUE (student_id, video_id)
);

-- 15. Coding Submissions
CREATE TABLE coding_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status submission_status NOT NULL DEFAULT 'ACCEPTED',
    test_cases_passed INTEGER NOT NULL DEFAULT 0,
    total_test_cases INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_coding_submissions_student ON coding_submissions(student_id, problem_id);

-- 16. MCQ Attempts
CREATE TABLE mcq_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subtopic_id UUID NOT NULL REFERENCES course_subtopics(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. MCQ Attempt Answers
CREATE TABLE mcq_attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES mcq_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES mcq_options(id) ON DELETE SET NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

-- 18. Live Classes
CREATE TABLE live_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    instructor_name VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_link TEXT NOT NULL,
    status live_class_status NOT NULL DEFAULT 'UPCOMING',
    max_participants INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_live_classes_status ON live_classes(status, start_time);

-- 19. Live Class Recordings
CREATE TABLE live_class_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 's3',
    storage_key TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_id VARCHAR(100) UNIQUE,
    payment_id VARCHAR(100),
    signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'PENDING',
    payment_method payment_method NOT NULL DEFAULT 'RAZORPAY',
    qr_reference_code VARCHAR(100),
    verified_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 21. Payment Events Log (Webhooks / Audit)
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'ANNOUNCEMENT',
    target_type VARCHAR(50), -- COURSE, LIVE_CLASS, PAYMENT, GENERAL
    target_id VARCHAR(100),
    target_audience target_audience NOT NULL DEFAULT 'ALL',
    target_course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 23. Notification Recipients
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_recipient_student UNIQUE (notification_id, student_id)
);
CREATE INDEX idx_notification_recipients_student ON notification_recipients(student_id, is_read);

-- 24. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);

-- 25. Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

## 4. System Architecture

```text
                               ┌──────────────────────────────────────────────────────────┐
                               │                    Client Browsers                       │
                               │  • Students (Mobile / Tablet / Desktop Web)              │
                               │  • Administrators (Admin Operations Console)             │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │ HTTPS / TLS 1.3
                                                            ▼
                               ┌──────────────────────────────────────────────────────────┐
                               │                 Reverse Proxy / Gateway                  │
                               │  • Rate Limiting (Token Bucket)                          │
                               │  • SSL Termination & Security Headers (HSTS, CSP)        │
                               │  • Static Asset Caching / CDN Router                     │
                               └─────────────┬──────────────────────────────┬─────────────┘
                                             │                              │
                                             ▼                              ▼
                 ┌───────────────────────────────────────┐   ┌────────────────────────────┐
                 │       Frontend Client App (SPA)       │   │    Static Assets & CDN     │
                 │   React / Vite / Tailwind UI / Lucide │   │  JS, CSS, Public Images    │
                 └───────────────────┬───────────────────┘   └────────────────────────────┘
                                     │ REST JSON APIs
                                     ▼
                 ┌────────────────────────────────────────────────────────────────────────┐
                 │                   Backend API Services (Node.js/Express)               │
                 │ ────────────────────────────────────────────────────────────────────── │
                 │  • Auth Service (JWT + Refresh Rotation + RBAC)                        │
                 │  • Student Lifecycle Manager (Approval, Suspension)                    │
                 │  • Course & Curriculum Engine (Topics, Subtopics, Content)             │
                 │  • Video Access Service (HMAC Signed URLs, Streaming Tokens)           │
                 │  • Code Sandbox Runner (Isolated Runner, Resource Guard)               │
                 │  • Quiz / MCQ Evaluation Engine                                        │
                 │  • Payment Orchestrator (Razorpay Orders, Webhooks, QR Verification)   │
                 │  • Live Class Scheduler (Jitsi / External Meeting Gateways)            │
                 │  • Segmented Notification Broker                                       │
                 │  • Immutable Audit Trail Recorder                                      │
                 └──────────────┬─────────────────────────────┬───────────────────────────┘
                                │                             │
                 ┌──────────────┴──────────────┐              │ Presigned Upload / Get
                 │ PostgreSQL Relational DB    │              ▼
                 │ ─────────────────────────── │   ┌──────────────────────────────────────┐
                 │ • ACID Transactions         │   │   Object Storage (Cloudflare R2/S3)  │
                 │ • Foreign Keys & Constraints│   │ ──────────────────────────────────── │
                 │ • Indexes & Connection Pool │   │ • Raw Encrypted Video Chunks         │
                 │ • WAL & Automated Snapshots │   │ • Course PDFs & Attachments          │
                 └─────────────────────────────┘   │ • Live Class Recordings              │
                                                   └──────────────────────────────────────┘
```

---

## 5. API Architecture

All endpoints follow RESTful standards and return standardized envelope payloads:
`{ "success": true, "data": ..., "message": "...", "meta": { "page": 1, ... } }` or `{ "success": false, "error": { "code": "...", "message": "..." } }`.

### Authentication & Account APIs (`/api/v1/auth`)
* `POST /api/v1/auth/register` — Student self-registration (validates phone, name, email, password; assigns `PENDING_APPROVAL`).
* `POST /api/v1/auth/login` — Phone/Email + password authentication; checks status (if `PENDING_APPROVAL`, returns specific code `ACCOUNT_PENDING_APPROVAL`). Issues HTTP-only refresh cookie and JSON access token.
* `POST /api/v1/auth/refresh` — Rotates refresh token and issues new access token.
* `POST /api/v1/auth/logout` — Revokes refresh token in database.
* `GET  /api/v1/auth/me` — Retrieves current authenticated user profile, roles, and status.

### Admin Student Management APIs (`/api/v1/admin/students`)
* `GET   /api/v1/admin/students/pending` — Lists pending student registrations with pagination.
* `PATCH /api/v1/admin/students/:id/approve` — Transitions student to `ACTIVE`; records audit log.
* `PATCH /api/v1/admin/students/:id/reject` — Transitions student to `REJECTED`; records audit log.
* `PATCH /api/v1/admin/students/:id/suspend` — Transitions student to `SUSPENDED`; increments `token_version` to revoke sessions.
* `PATCH /api/v1/admin/students/:id/reactivate` — Re-enables suspended student to `ACTIVE`.
* `GET   /api/v1/admin/students` — Search, filter, and paginate all students.
* `GET   /api/v1/admin/students/:id` — Comprehensive student dossier: profile, purchases, progress, payment history.

### Admin Course & Content Management (`/api/v1/admin/courses`)
* `POST  /api/v1/admin/courses` — Create new course.
* `PUT   /api/v1/admin/courses/:id` — Edit course details, pricing, instructor.
* `DELETE /api/v1/admin/courses/:id` — Soft-delete course.
* `POST  /api/v1/admin/courses/:id/topics` — Create topic.
* `POST  /api/v1/admin/topics/:topicId/subtopics` — Create subtopic.
* `POST  /api/v1/admin/subtopics/:subtopicId/videos` — Add video content.
* `POST  /api/v1/admin/subtopics/:subtopicId/coding` — Add coding problem & test cases.
* `POST  /api/v1/admin/subtopics/:subtopicId/mcqs` — Add MCQ questions & options.

### Student Learning & Progress (`/api/v1/student`)
* `GET  /api/v1/student/dashboard` — Recent course progress, upcoming live class, unread notifications.
* `GET  /api/v1/student/courses` — List all active enrolled courses.
* `GET  /api/v1/student/courses/:courseId/learn` — Hierarchical curriculum tree with completed item flags.
* `GET  /api/v1/student/subtopics/:id/content` — Content details; generates 15-minute temporary signed video streaming URL if enrolled.
* `POST /api/v1/student/progress/video` — Update playback timestamp and mark completion.
* `POST /api/v1/student/coding/:problemId/run` — Run code against sample test cases in sandbox.
* `POST /api/v1/student/coding/:problemId/submit` — Submit code against all test cases; records submission.
* `GET  /api/v1/student/mcq/:subtopicId` — Retrieve quiz questions (omits `is_correct` answers).
* `POST /api/v1/student/mcq/:subtopicId/submit` — Evaluate answers, record attempt, calculate score.

### Payment & Enrollment (`/api/v1/payments`)
* `GET  /api/v1/courses/browse` — Public/Student catalogue with purchase status flags.
* `POST /api/v1/payments/create-order` — Creates Razorpay order for authenticated student.
* `POST /api/v1/payments/verify` — Cryptographically verifies Razorpay signature; creates enrollment.
* `POST /api/v1/payments/webhook` — Verifies webhook signature; guarantees idempotent fulfillment.
* `POST /api/v1/payments/qr-claim` — Submits manual QR payment transaction ID / UTR.
* `GET  /api/v1/admin/payments` — Admin payment dashboard with filters (status, date, course, student).
* `PATCH /api/v1/admin/payments/:id/verify-qr` — Admin approves manual QR transaction -> grants enrollment.

### Live Classes (`/api/v1/live-classes`)
* `GET  /api/v1/student/live-classes` — Upcoming & past live classes for enrolled courses.
* `GET  /api/v1/student/live-classes/:id/join` — Validates start window and generates meeting access token.
* `POST /api/v1/admin/live-classes` — Schedule new live session.
* `PUT  /api/v1/admin/live-classes/:id` — Reschedule / update session details.
* `POST /api/v1/admin/live-classes/:id/recording` — Attach recording link/key.

### Notifications & Audit (`/api/v1/notifications`, `/api/v1/admin/audit`)
* `GET   /api/v1/notifications` — List student notifications with read/unread flags.
* `PATCH /api/v1/notifications/:id/read` — Mark notification read.
* `POST  /api/v1/admin/notifications` — Broadcast notification to all, course-specific, or selected students.
* `GET   /api/v1/admin/audit-logs` — Query administrative audit logs with pagination and filters.

---

## 6. Frontend Page and Component Structure

```text
frontend/src/
├── assets/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   ├── student/
│   │   ├── TopNav.tsx
│   │   ├── Sidebar.tsx
│   │   ├── CourseCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── NotificationDropdown.tsx
│   ├── learning/
│   │   ├── CurriculumTree.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── CodeEditor.tsx
│   │   └── MCQQuiz.tsx
│   └── admin/
│       ├── AdminNav.tsx
│       ├── AdminSidebar.tsx
│       ├── StudentApprovalTable.tsx
│       ├── CourseFormModal.tsx
│       ├── CurriculumBuilder.tsx
│       └── PaymentVerificationTable.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
├── layouts/
│   ├── AuthLayout.tsx
│   ├── StudentLayout.tsx
│   ├── AdminLayout.tsx
│   └── LearningLayout.tsx
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── PendingApprovalPage.tsx
│   ├── student/
│   │   ├── DashboardHomePage.tsx
│   │   ├── MyCoursesPage.tsx
│   │   ├── BrowseCoursesPage.tsx
│   │   ├── CourseDetailPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── LearningPlatformPage.tsx
│   │   ├── LiveClassesPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── HelpPage.tsx
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── PendingStudentsPage.tsx
│       ├── AllStudentsPage.tsx
│       ├── CourseManagementPage.tsx
│       ├── CurriculumEditorPage.tsx
│       ├── LiveClassManagementPage.tsx
│       ├── PaymentManagementPage.tsx
│       ├── NotificationDispatcherPage.tsx
│       └── AuditLogsPage.tsx
├── services/
│   ├── api.ts
│   ├── authService.ts
│   ├── studentService.ts
│   ├── courseService.ts
│   ├── paymentService.ts
│   └── adminService.ts
└── types/
    └── index.ts
```

---

## 7. Authentication & Authorization Flow

```text
                                Student Registration Flow
Student Form (Phone, Name, Pass) ──► Validates inputs & E.164 phone
                                 ──► Hashes password with bcrypt (cost 12)
                                 ──► Inserts users (status: PENDING_APPROVAL)
                                 ──► Inserts student_profiles
                                 ──► Returns 201: "Account created. Awaiting admin approval."
                                 ──► UI redirects to /pending-approval screen

                                Admin Approval Flow
Admin navigates to /admin/pending ──► GET /api/v1/admin/students/pending
Admin clicks [Approve]            ──► PATCH /api/v1/admin/students/:id/approve
                                  ──► DB: users.status = 'ACTIVE'
                                  ──► Records audit_log (Admin X approved Student Y)
                                  ──► Dispatches welcome notification to student

                                Login & Session Flow
User submits credentials          ──► Validates phone/email & password
                                  ──► Check 1: Is user.status == 'ACTIVE'?
                                      - If 'PENDING_APPROVAL' ──► HTTP 403 (ACCOUNT_PENDING_APPROVAL)
                                      - If 'REJECTED' ─────────► HTTP 403 (ACCOUNT_REJECTED)
                                      - If 'SUSPENDED' ────────► HTTP 403 (ACCOUNT_SUSPENDED)
                                  ──► Generates 15-min JWT Access Token:
                                      { sub: userId, role, status, tokenVersion }
                                  ──► Generates 7-day Refresh Token, stores SHA256 hash in DB
                                  ──► Returns access token + sets HTTP-only secure cookie

                                Server-side RBAC Guard
Protected Endpoint Request        ──► verifyToken middleware validates signature & exp
                                  ──► Checks users.token_version == payload.tokenVersion
                                  ──► requireRole(['ADMIN'] or ['STUDENT'])
                                  ──► Enforces active status check on every request
```

---

## 8. Payment Flow (Razorpay + Manual QR)

```text
                                Automated Razorpay Gateway Flow
1. Student clicks [Buy Now] ──► Checks user ACTIVE status & non-enrollment
2. Frontend Checkout Page   ──► Auto-populates student details from DB profile
3. POST /create-order       ──► Backend calls Razorpay API: creates order_id
                            ──► DB inserts payments (status: PENDING, method: RAZORPAY)
4. Frontend SDK             ──► Opens Razorpay checkout modal with order_id
5. Student completes payment──► Gateway returns razorpay_payment_id & signature
6. POST /verify             ──► Backend computes HMAC-SHA256(order_id + "|" + payment_id, secret)
                            ──► Uses crypto.timingSafeEqual to verify signature
                            ──► DB Transaction:
                                - UPDATE payments SET status='SUCCESS', payment_id=...
                                - INSERT INTO course_enrollments (student_id, course_id)
                                - INSERT initial student_progress records
                            ──► Emits notification to student; course active in My Courses

                                Webhook Failsafe Flow
Razorpay Event (payment.captured) ──► POST /api/v1/payments/webhook
                                  ──► Verifies X-Razorpay-Signature header against raw body
                                  ──► Idempotency Check: Is payment already marked SUCCESS?
                                      - If yes: Return 200 OK immediately
                                      - If pending: Apply DB enrollment transaction

                                Manual QR Payment Flow
Student selects "Scan QR"   ──► Displays institute dynamic QR code + order reference code
Student pays via UPI app    ──► Clicks [I Have Completed Payment] & enters UTR / Ref Number
Backend records claim       ──► payments.status = 'PENDING', payment_method = 'QR_CODE'
Admin Review                ──► Appears in Admin Payments Dashboard: "QR Verification Needed"
Admin verifies bank receipt ──► Admin clicks [Verify & Approve]
                            ──► DB Transaction: payments.status = 'MANUALLY_VERIFIED', creates enrollment
```

---

## 9. Video Storage & DRM-Protection Architecture

* Large video files are strictly prohibited from database storage.
* Video assets are stored in object storage (AWS S3 or Cloudflare R2).
* All storage buckets are configured with **Private Access Only** (public read disabled, CORS restricted to the LMS domain).
* When a student requests video streaming:
  1. Frontend calls `GET /api/v1/student/subtopics/:id/content`.
  2. Middleware asserts that the requesting student has an `ACTIVE` enrollment for the parent course.
  3. Backend generates an HMAC-SHA256 Presigned URL with a **15-minute expiration window**.
  4. Video player receives the presigned URL.
  5. Playback progress is pushed every 10 seconds (`POST /api/v1/student/progress/video`) recording `last_position_seconds` and setting `is_completed = true` when >90% watched.

---

## 10. Backup & Disaster Recovery Architecture

```text
                  Development Laptop                     Production Cloud
             ┌───────────────────────────┐         ┌───────────────────────────┐
             │ Node.js Server & Frontend │         │ Auto-scaling API Instances│
             └─────────────┬─────────────┘         └─────────────┬─────────────┘
                           │                                     │
                           ▼                                     ▼
             ┌───────────────────────────┐         ┌───────────────────────────┐
             │ PostgreSQL (Local/Docker) │         │ Managed PostgreSQL Cluster│
             └─────────────┬─────────────┘         └─────────────┬─────────────┘
                           │                                     │
                           ▼                                     ▼
             ┌───────────────────────────┐         ┌───────────────────────────┐
             │ pg_dump Daily Snapshot    │         │ Automated Daily Snapshots │
             │ & SQL Migrations          │         │ + Continuous WAL Archive  │
             └───────────────────────────┘         └─────────────┬─────────────┘
                                                                 │
                                                                 ▼
                                                   ┌───────────────────────────┐
                                                   │ Offsite Encrypted Bucket  │
                                                   │ 30-Day Daily Retention    │
                                                   │ 12-Month Monthly Archive  │
                                                   └───────────────────────────┘
```
* **Stateless Application Tier**: The backend contains no local filesystem state. Any instance can be replaced or spun up via `docker-compose` or Kubernetes manifests.
* **Continuous Migrations**: All schema modifications are versioned via SQL migration scripts. Moving to a new host requires only running migrations against the new database connection.
* **Object Storage Versioning**: Video assets in S3/R2 have object versioning and multi-region replication enabled to protect against accidental deletion.

---

## 11. Security Risk Analysis & Countermeasures

| Threat Category | Specific Attack Vector | Architectural Mitigation |
| :--- | :--- | :--- |
| **Authentication** | Brute-force password guessing & credential stuffing | Rate limiter (5 attempts per 15 min per IP/phone) + progressive lockout in DB. |
| **Authorization** | Insecure Direct Object Reference (IDOR) on course videos | Every video/topic endpoint verifies active course enrollment in DB; direct file URLs are private. |
| **Tampering** | Frontend price manipulation during checkout | Server strictly looks up official course price from DB when creating Razorpay order; ignores client price. |
| **Code Execution** | Arbitrary code execution (fork bombs, `rm -rf`, network scanning) in coding exercises | Sandboxed child execution with resource caps (2s timeout, 128MB RAM, no network, drop root). |
| **Injection** | SQL Injection | 100% parameterized queries via PostgreSQL client adapter. Zero string concatenation. |
| **Data Leakage** | Storing plain secrets or credentials in git | All secrets passed via environment variables; `.env` excluded in `.gitignore`. |
| **Session Hijacking**| Stolen JWT tokens | Short-lived access token (15m), refresh tokens stored as SHA256 hashes, instant revocation via `token_version`. |

---

## 12. Phased Development Roadmap

* **Phase 1: Authentication + Student Approval Engine**
  * Database schema setup & migration scripts.
  * Express server initialization with security middleware (Helmet, CORS, Rate Limiters).
  * Auth endpoints: Register, Login, Refresh, Logout, Status Guard.
  * Admin Pending Students review API: Approve, Reject, Suspend, Reactivate.
  * Modern Responsive React Frontend: Split Auth layout, Registration with validation, Login with role routing, Pending Approval Notice, Admin Pending Students moderation console.
* **Phase 2: Student Dashboard & Profiles** (Home, Continue Learning widget, My Courses, Profile editing).
* **Phase 3: Course Management** (Admin CRUD for Courses, Topics, Subtopics, Content hierarchy).
* **Phase 4: Course Learning Platform** (Curriculum sidebar, Video player with progress tracking, Code editor sandbox, MCQ quiz engine).
* **Phase 5: Course Catalogue & Razorpay Integration** (Browse catalogue, Student checkout confirmation, Razorpay order/verify, Manual QR payment flow).
* **Phase 6: Live Classes & Recordings** (Scheduler, upcoming/live status badges, join link access gate, recording archive).
* **Phase 7: Notification System** (Segmented broadcast, unread badge counter, contextual deep-link redirection).
* **Phase 8: Admin Dashboard, Analytics, Audit Trail & Support FAQs**.
* **Phase 9: Security Hardening & Automated Test Suite** (Penetration test cases, authorization tests, payment tamper tests).
* **Phase 10: Production Deployment Configuration & Disaster Recovery Tooling**.
