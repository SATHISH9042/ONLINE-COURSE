import { api } from './api';
import {
  ApiResponse,
  MentorStats,
  AssignedStudent,
  StudentDetailAudit,
  AdminMentorItem,
  AdminStudentWithMentor,
} from '../types';

export interface MentorDashboardData {
  stats: MentorStats;
  assignedStudents: AssignedStudent[];
  recentActivity: Array<{
    student_id: string;
    student_name: string;
    activity_type: string;
    description: string;
    timestamp: string;
  }>;
}

export const mentorService = {
  // --- Mentor Portal Endpoints ---
  async getDashboard(): Promise<ApiResponse<MentorDashboardData>> {
    return api.get<MentorDashboardData>('/mentor/dashboard');
  },

  async getAssignedStudents(search?: string): Promise<ApiResponse<AssignedStudent[]>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<AssignedStudent[]>(`/mentor/students${query}`);
  },

  async getStudentDetails(studentId: string): Promise<ApiResponse<StudentDetailAudit>> {
    return api.get<StudentDetailAudit>(`/mentor/students/${studentId}`);
  },

  async addStudentNote(
    studentId: string,
    note: string,
    tag?: string
  ): Promise<ApiResponse<any>> {
    return api.post(`/mentor/students/${studentId}/notes`, { note, tag });
  },

  async deleteStudentNote(noteId: string): Promise<ApiResponse<any>> {
    return api.delete(`/mentor/notes/${noteId}`);
  },

  // --- Admin Mentor Management Endpoints ---
  async listMentors(): Promise<ApiResponse<AdminMentorItem[]>> {
    return api.get<AdminMentorItem[]>('/admin/mentors');
  },

  async createMentor(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    specialization?: string;
    bio?: string;
  }): Promise<ApiResponse<any>> {
    return api.post('/admin/mentors', data);
  },

  async assignStudents(
    mentorId: string,
    studentIds: string[],
    notes?: string
  ): Promise<ApiResponse<any>> {
    return api.post('/admin/mentors/assign', { mentorId, studentIds, notes });
  },

  async unassignStudent(
    mentorId: string,
    studentId: string
  ): Promise<ApiResponse<any>> {
    return api.delete(`/admin/mentors/${mentorId}/students/${studentId}`);
  },

  async getAllStudentsWithMentors(search?: string): Promise<ApiResponse<AdminStudentWithMentor[]>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<AdminStudentWithMentor[]>(`/admin/mentors/students-matrix${query}`);
  },
};
