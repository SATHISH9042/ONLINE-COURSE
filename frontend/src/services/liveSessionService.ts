import { api } from './api';

export interface Participant {
  userId: string;
  name: string;
  role: 'ADMIN' | 'STUDENT';
  canSpeak: boolean;
  handRaised: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  joinedAt: string;
}

export interface LiveSessionData {
  id: string;
  title: string;
  description: string | null;
  instructorName: string;
  courseTitle: string;
  courseThumbnail?: string | null;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  startTime: string;
  endTime: string;
  isRecording: boolean;
  recordingDurationSeconds: number;
  isHost: boolean;
  currentParticipant: Participant;
  participants: Participant[];
}

export interface SessionChatMessage {
  id: string;
  live_class_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'ADMIN' | 'STUDENT' | 'SYSTEM';
  message: string;
  is_pinned: boolean;
  created_at: string;
}

export const liveSessionService = {
  /**
   * Get live session details and register current user in the room
   */
  async getSessionDetails(classId: string, isAdmin = false): Promise<LiveSessionData> {
    const endpoint = isAdmin
      ? `/admin/live-classes/${classId}/session`
      : `/student/live-classes/${classId}/session`;
    const res = await api.get<LiveSessionData>(endpoint);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to connect to live session.');
    }
    return res.data;
  },

  /**
   * Host starts or stops session recording
   */
  async controlRecording(classId: string, action: 'START' | 'STOP') {
    const res = await api.post(`/admin/live-classes/${classId}/session/recording`, { action });
    if (!res.success) {
      throw new Error(res.message || `Failed to ${action.toLowerCase()} recording.`);
    }
    return res.data;
  },

  /**
   * Host grants or revokes speaking permission for a student
   */
  async setSpeakingPermission(classId: string, studentId: string, allowed: boolean) {
    const res = await api.post(`/admin/live-classes/${classId}/session/speaking`, {
      studentId,
      allowed,
    });
    if (!res.success) {
      throw new Error(res.message || 'Failed to update speaking permission.');
    }
    return res.data;
  },

  /**
   * Host mutes all students
   */
  async muteAllStudents(classId: string) {
    const res = await api.post(`/admin/live-classes/${classId}/session/mute-all`);
    if (!res.success) {
      throw new Error(res.message || 'Failed to mute all students.');
    }
    return res.data;
  },

  /**
   * Student raises or lowers hand
   */
  async toggleRaiseHand(classId: string, raised: boolean) {
    const res = await api.post(`/student/live-classes/${classId}/session/hand`, { raised });
    if (!res.success) {
      throw new Error(res.message || 'Failed to toggle raise hand.');
    }
    return res.data;
  },

  /**
   * Send chat message into the live classroom
   */
  async sendMessage(classId: string, text: string, isAdmin = false, isPinned = false) {
    const endpoint = isAdmin
      ? `/admin/live-classes/${classId}/session/messages`
      : `/student/live-classes/${classId}/session/messages`;
    const res = await api.post<SessionChatMessage>(endpoint, { text, isPinned });
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to send message.');
    }
    return res.data;
  },

  /**
   * Fetch chat messages history
   */
  async getMessages(classId: string, isAdmin = false): Promise<SessionChatMessage[]> {
    const endpoint = isAdmin
      ? `/admin/live-classes/${classId}/session/messages`
      : `/student/live-classes/${classId}/session/messages`;
    const res = await api.get<SessionChatMessage[]>(endpoint);
    if (!res.success || !res.data) {
      return [];
    }
    return res.data;
  },
};
