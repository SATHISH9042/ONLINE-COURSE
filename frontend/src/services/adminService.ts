import { api } from './api';
import { ApiResponse, StudentListItem } from '../types';

export const adminService = {
  async getPendingStudents(page = 1, limit = 20): Promise<ApiResponse<StudentListItem[]>> {
    return api.get<StudentListItem[]>(`/admin/students/pending?page=${page}&limit=${limit}`);
  },

  async approveStudent(id: string): Promise<ApiResponse<any>> {
    return api.patch(`/admin/students/${id}/approve`);
  },

  async rejectStudent(id: string, reason?: string): Promise<ApiResponse<any>> {
    return api.patch(`/admin/students/${id}/reject`, { reason });
  },

  async suspendStudent(id: string, reason?: string): Promise<ApiResponse<any>> {
    return api.patch(`/admin/students/${id}/suspend`, { reason });
  },

  async reactivateStudent(id: string): Promise<ApiResponse<any>> {
    return api.patch(`/admin/students/${id}/reactivate`);
  },

  async getAllStudents(page = 1, limit = 20, status?: string, search?: string): Promise<ApiResponse<StudentListItem[]>> {
    let url = `/admin/students?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return api.get<StudentListItem[]>(url);
  },

  async getAdminSummary(): Promise<ApiResponse<any>> {
    return api.get('/admin/summary');
  },
};
