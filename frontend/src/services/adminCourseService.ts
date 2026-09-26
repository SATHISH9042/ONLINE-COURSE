import { api } from './api';
import { ApiResponse } from '../types';

export interface AdminCourseItem {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description?: string;
  thumbnail_url: string;
  price: number | string;
  currency: string;
  duration_hours: number;
  instructor_name: string;
  is_published: boolean;
  topic_count: number;
  subtopic_count: number;
  enrollment_count: number;
  created_at: string;
  updated_at: string;
}

export interface VideoContent {
  id: string;
  title: string;
  description?: string;
  storage_provider: string;
  storage_key: string;
  duration_seconds: number;
  is_preview: boolean;
}

export interface CodingProblemContent {
  id: string;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  allowed_languages: string[];
}

export interface McqOption {
  id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface McqContent {
  id: string;
  question_text: string;
  explanation?: string;
  points: number;
  options: McqOption[];
}

export interface SubtopicDetail {
  id: string;
  title: string;
  sort_order: number;
  videos: VideoContent[];
  codingProblems: CodingProblemContent[];
  mcqs: McqContent[];
}

export interface TopicDetail {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
  subtopics: SubtopicDetail[];
}

export interface CourseDetailWithCurriculum extends AdminCourseItem {
  topics: TopicDetail[];
}

export const adminCourseService = {
  async listCourses(): Promise<ApiResponse<AdminCourseItem[]>> {
    return api.get<AdminCourseItem[]>('/admin/courses');
  },

  async getCourseDetails(id: string): Promise<ApiResponse<CourseDetailWithCurriculum>> {
    return api.get<CourseDetailWithCurriculum>(`/admin/courses/${id}`);
  },

  async createCourse(data: {
    title: string;
    shortDescription: string;
    description: string;
    thumbnailUrl?: string;
    price: number;
    durationHours: number;
    instructorName: string;
    isPublished?: boolean;
  }): Promise<ApiResponse<AdminCourseItem>> {
    return api.post<AdminCourseItem>('/admin/courses', data);
  },

  async updateCourse(
    id: string,
    data: {
      title?: string;
      shortDescription?: string;
      description?: string;
      thumbnailUrl?: string;
      price?: number;
      durationHours?: number;
      instructorName?: string;
      isPublished?: boolean;
    }
  ): Promise<ApiResponse<AdminCourseItem>> {
    return api.put<AdminCourseItem>(`/admin/courses/${id}`, data);
  },

  async togglePublish(id: string): Promise<ApiResponse<any>> {
    return api.patch(`/admin/courses/${id}/publish`);
  },

  async deleteCourse(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/admin/courses/${id}`);
  },

  // Topics
  async createTopic(courseId: string, data: { title: string; description?: string; sortOrder?: number }): Promise<ApiResponse<any>> {
    return api.post(`/admin/courses/${courseId}/topics`, data);
  },

  async deleteTopic(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/admin/topics/${id}`);
  },

  // Subtopics
  async createSubtopic(topicId: string, data: { title: string; sortOrder?: number }): Promise<ApiResponse<any>> {
    return api.post(`/admin/topics/${topicId}/subtopics`, data);
  },

  async deleteSubtopic(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/admin/subtopics/${id}`);
  },

  // Videos
  async createVideo(subtopicId: string, data: {
    title: string;
    description?: string;
    storageKey: string;
    durationSeconds?: number;
    isPreview?: boolean;
  }): Promise<ApiResponse<any>> {
    return api.post(`/admin/subtopics/${subtopicId}/videos`, data);
  },

  async deleteVideo(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/admin/videos/${id}`);
  },

  // Coding Problems
  async createCodingProblem(subtopicId: string, data: {
    title: string;
    description: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    allowedLanguages?: string[];
    testCases?: Array<{ inputData: string; expectedOutput: string; isHidden?: boolean }>;
  }): Promise<ApiResponse<any>> {
    return api.post(`/admin/subtopics/${subtopicId}/coding`, data);
  },

  async deleteCodingProblem(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/admin/coding/${id}`);
  },

  // MCQs
  async createMcq(subtopicId: string, data: {
    questionText: string;
    explanation?: string;
    points?: number;
    options: Array<{ optionText: string; isCorrect: boolean }>;
  }): Promise<ApiResponse<any>> {
    return api.post(`/admin/subtopics/${subtopicId}/mcqs`, data);
  },

  async deleteMcq(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/admin/mcqs/${id}`);
  },
};
