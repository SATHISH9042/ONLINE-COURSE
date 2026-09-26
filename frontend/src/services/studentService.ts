import { api } from './api';
import { ApiResponse } from '../types';

export interface DashboardSummaryData {
  continueLearning: {
    courseId: string;
    courseTitle: string;
    topicId: string;
    topicTitle: string;
    subtopicId: string;
    subtopicTitle: string;
    progressPercent: number;
    isCompleted: boolean;
    lastAccessedAt: string | null;
  } | null;
  enrolledCourses: Array<{
    id: string;
    title: string;
    slug: string;
    short_description: string;
    thumbnail_url: string;
    instructor_name: string;
    duration_hours: number;
    enrolled_at: string;
    total_topics: number;
    total_subtopics: number;
    completed_subtopics: number;
    progress_percent: number;
  }>;
  upcomingLiveClasses: Array<{
    id: string;
    title: string;
    description: string;
    instructor_name: string;
    start_time: string;
    end_time: string;
    meeting_link: string;
    status: string;
    course_title?: string;
  }>;
  unreadNotificationsCount: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    is_read: boolean;
  }>;
  stats: {
    enrolledCoursesCount: number;
    completedLessonsCount: number;
    totalLessonsCount: number;
    overallProgressPercent: number;
  };
}

export interface EnrolledCourseItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  instructorName: string;
  durationHours: number;
  enrolledAt: string;
  totalTopics: number;
  totalSubtopics: number;
  completedSubtopics: number;
  progressPercent: number;
  lastAccessedLesson: string;
}

export interface StudentProfileData {
  id: string;
  phone: string;
  email: string | null;
  status: string;
  registered_at: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  enrolled_courses_count: string | number;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
}

export const studentService = {
  async getDashboardSummary(): Promise<ApiResponse<DashboardSummaryData>> {
    return api.get<DashboardSummaryData>('/student/dashboard');
  },

  async getMyCourses(): Promise<ApiResponse<EnrolledCourseItem[]>> {
    return api.get<EnrolledCourseItem[]>('/student/courses');
  },

  async getProfile(): Promise<ApiResponse<StudentProfileData>> {
    return api.get<StudentProfileData>('/student/profile');
  },

  async updateProfile(data: {
    fullName?: string;
    email?: string;
    city?: string;
    state?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<ApiResponse<any>> {
    return api.put('/student/profile', data);
  },

  async getFaqs(): Promise<ApiResponse<FAQItem[]>> {
    return api.get<FAQItem[]>('/student/faqs');
  },
};
