export type UserRole = 'STUDENT' | 'ADMIN' | 'MENTOR';

export type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  department?: string | null;
  specialization?: string | null;
  registeredAt?: string;
}

export interface StudentListItem {
  id: string;
  phone: string;
  email: string | null;
  status: UserStatus;
  registration_date: string;
  student_name: string;
  city: string | null;
  state: string | null;
  enrolled_courses_count?: number;
}

export interface MentorStats {
  totalStudents: number;
  activeStudents7Days: number;
  avgCourseProgress: number;
  totalClassesAttended: number;
  totalLiveClasses: number;
  avgAttendanceRate: number;
}

export interface AssignedStudent {
  id: string;
  email: string;
  phone: string;
  status: UserStatus;
  full_name: string;
  avatar_url?: string | null;
  city?: string | null;
  state?: string | null;
  college?: string | null;
  degree?: string | null;
  assigned_at: string;
  mentor_notes?: string | null;
  admin_assignment_notes?: string | null;
  total_login_days: number;
  last_login_at?: string | null;
  live_classes_attended: number;
  total_live_classes?: number;
  problems_solved: number;
  tests_attempted: number;
  avg_progress_pct: number;
}

export interface LiveClassAttendanceRecord {
  live_class_id: string;
  title: string;
  instructor_name: string;
  start_time: string;
  end_time: string;
  status: string;
  meeting_link: string;
  attended: boolean;
  joined_at?: string | null;
  duration_minutes: number;
}

export interface LoginActivityRecord {
  id: string;
  ip_address: string;
  user_agent: string;
  login_at: string;
  login_date: string;
}

export interface UniqueLoginDay {
  login_date: string;
  login_count: number;
  first_login_of_day: string;
}

export interface StudentCourseProgress {
  course_id: string;
  title: string;
  slug: string;
  thumbnail_url?: string | null;
  duration_hours: number;
  instructor_name: string;
  enrollment_status: string;
  enrolled_at: string;
  total_subtopics: number;
  completed_subtopics: number;
  last_accessed_at?: string | null;
  progress_percentage: number;
}

export interface CodingSubmissionRecord {
  id: string;
  problem_id: string;
  problem_title: string;
  difficulty: string;
  language: string;
  status: string;
  score: number;
  test_cases_passed: number;
  total_test_cases: number;
  execution_time_ms: number;
  submitted_at: string;
}

export interface McqAttemptRecord {
  id: string;
  subtopic_id: string;
  subtopic_title: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  attempt_number: number;
  created_at: string;
}

export interface MentorNoteRecord {
  id: string;
  note: string;
  tag: string;
  created_at: string;
  author_name: string;
  is_own_note: boolean;
}

export interface StudentDetailAudit {
  student: {
    id: string;
    email: string;
    phone: string;
    status: UserStatus;
    created_at: string;
    full_name: string;
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    college?: string | null;
    degree?: string | null;
    graduation_year?: number | null;
  };
  assignment: {
    id: string;
    assigned_at: string;
    notes?: string | null;
  };
  courses: StudentCourseProgress[];
  liveClasses: {
    summary: {
      total: number;
      attended: number;
      absent: number;
      attendanceRate: number;
    };
    records: LiveClassAttendanceRecord[];
  };
  loginActivity: {
    summary: {
      totalLoginDays: number;
      totalLogins: number;
      currentStreakDays: number;
      firstLoginAt: string | null;
      lastLoginAt: string | null;
    };
    uniqueDays: UniqueLoginDay[];
    history: LoginActivityRecord[];
  };
  codingSubmissions: CodingSubmissionRecord[];
  mcqAttempts: McqAttemptRecord[];
  mentorNotes: MentorNoteRecord[];
}

export interface AdminMentorItem {
  id: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  full_name: string;
  specialization?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  assigned_students_count: number;
}

export interface AdminStudentWithMentor {
  id: string;
  email: string;
  phone: string;
  status: UserStatus;
  created_at: string;
  full_name: string;
  avatar_url?: string | null;
  city?: string | null;
  state?: string | null;
  college?: string | null;
  mentor_id?: string | null;
  assigned_at?: string | null;
  assignment_notes?: string | null;
  assigned_mentor_name?: string | null;
  assigned_mentor_specialization?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
