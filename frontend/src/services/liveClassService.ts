import { api } from './api';

export interface LiveClass {
  id: string;
  course_id: string | null;
  instructor_name: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  max_participants: number;
  course_title?: string | null;
  course_thumbnail?: string | null;
  is_enrolled_course?: boolean;
}

export interface LiveClassRecording {
  id: string;
  liveClassId: string;
  title: string;
  classTitle: string;
  instructorName: string;
  courseId: string | null;
  courseTitle: string;
  courseThumbnail?: string | null;
  storageKey: string;
  durationSeconds: number;
  durationFormatted: string;
  createdAt: string;
  streamUrl: string;
}

export interface StudentLiveClassesData {
  live: LiveClass[];
  upcoming: LiveClass[];
  past: LiveClass[];
  recordings: LiveClassRecording[];
}

export interface AdminRecording {
  id: string;
  live_class_id: string;
  title: string;
  storage_key: string;
  duration_seconds: number;
  durationFormatted: string;
  created_at: string;
}

export interface AdminLiveClass {
  id: string;
  course_id: string | null;
  instructor_name: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  max_participants: number;
  created_at: string;
  updated_at: string;
  course_title: string | null;
  recording_count: number;
  recordingCount: number;
  recordings: AdminRecording[];
}

export interface CreateLiveClassPayload {
  courseId?: string | null;
  instructorName: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  maxParticipants?: number;
}

export interface UpdateLiveClassPayload {
  courseId?: string | null;
  instructorName?: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  meetingLink?: string;
  status?: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  maxParticipants?: number;
}

export interface AddRecordingPayload {
  title: string;
  storageKey: string;
  durationSeconds: number;
  storageProvider?: string;
}

export const liveClassService = {
  // Student API
  async getStudentLiveClasses(): Promise<StudentLiveClassesData> {
    const res = await api.get<StudentLiveClassesData>('/student/live-classes');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to load live classes');
    }
    return res.data;
  },

  // Admin API
  async getAdminLiveClasses(): Promise<AdminLiveClass[]> {
    const res = await api.get<AdminLiveClass[]>('/admin/live-classes');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to load admin live classes');
    }
    return res.data;
  },

  async createLiveClass(payload: CreateLiveClassPayload): Promise<AdminLiveClass> {
    const res = await api.post<AdminLiveClass>('/admin/live-classes', payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to schedule live class');
    }
    return res.data;
  },

  async updateLiveClass(id: string, payload: UpdateLiveClassPayload): Promise<AdminLiveClass> {
    const res = await api.patch<AdminLiveClass>(`/admin/live-classes/${id}`, payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to update live class');
    }
    return res.data;
  },

  async deleteLiveClass(id: string): Promise<void> {
    const res = await api.delete(`/admin/live-classes/${id}`);
    if (!res.success) {
      throw new Error(res.message || 'Failed to delete live class');
    }
  },

  async addRecording(classId: string, payload: AddRecordingPayload): Promise<AdminRecording> {
    const res = await api.post<AdminRecording>(
      `/admin/live-classes/${classId}/recordings`,
      payload
    );
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to attach recording');
    }
    return res.data;
  },

  async deleteRecording(recordingId: string): Promise<void> {
    const res = await api.delete(`/admin/recordings/${recordingId}`);
    if (!res.success) {
      throw new Error(res.message || 'Failed to delete recording');
    }
  },
};
