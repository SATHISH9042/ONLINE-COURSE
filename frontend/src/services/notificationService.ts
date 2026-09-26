import { api } from './api';

export interface NotificationItem {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'LIVE_CLASS' | 'COURSE' | 'SYSTEM' | 'PAYMENT';
  targetType?: string | null;
  targetId?: string | null;
  targetCourseId?: string | null;
  courseTitle?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface StudentNotificationsData {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  targetAudience: 'ALL' | 'COURSE' | 'SPECIFIC';
  targetType?: string | null;
  targetId?: string | null;
  targetCourseId?: string | null;
  courseTitle?: string | null;
  adminEmail?: string | null;
  createdAt: string;
  recipientsCount: number;
  readCount: number;
}

export interface SendBroadcastPayload {
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'LIVE_CLASS' | 'COURSE' | 'SYSTEM';
  targetAudience: 'ALL' | 'COURSE' | 'STUDENT';
  targetCourseId?: string | null;
  targetStudentId?: string | null;
}

export const notificationService = {
  // Student APIs
  async getStudentNotifications(unreadOnly = false): Promise<StudentNotificationsData> {
    const res = await api.get<StudentNotificationsData>(
      `/student/notifications${unreadOnly ? '?unreadOnly=true' : ''}`
    );
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to load notifications');
    }
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<{ unreadCount: number }>('/student/notifications/unread-count');
    if (!res.success || !res.data) {
      return 0;
    }
    return res.data.unreadCount;
  },

  async markAsRead(id: string): Promise<void> {
    const res = await api.patch(`/student/notifications/${id}/read`);
    if (!res.success) {
      throw new Error(res.message || 'Failed to mark notification as read');
    }
  },

  async markAllAsRead(): Promise<void> {
    const res = await api.patch('/student/notifications/mark-all-read');
    if (!res.success) {
      throw new Error(res.message || 'Failed to mark all as read');
    }
  },

  // Admin APIs
  async listAdminNotifications(): Promise<AdminNotificationItem[]> {
    const res = await api.get<AdminNotificationItem[]>('/admin/notifications');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to list admin notifications');
    }
    return res.data;
  },

  async sendBroadcast(payload: SendBroadcastPayload): Promise<any> {
    const res = await api.post('/admin/notifications', payload);
    if (!res.success) {
      throw new Error(res.message || 'Failed to send broadcast');
    }
    return res.data;
  },

  async deleteNotification(id: string): Promise<void> {
    const res = await api.delete(`/admin/notifications/${id}`);
    if (!res.success) {
      throw new Error(res.message || 'Failed to delete notification');
    }
  },
};
