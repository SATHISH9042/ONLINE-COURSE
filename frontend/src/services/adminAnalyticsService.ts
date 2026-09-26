import { api } from './api';

export interface DashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
  activeCourses: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  todaySales: number;
  activeLiveClasses: number;
  upcomingLiveClasses: number;
}

export interface RecentStudentItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  city: string | null;
  registeredAt: string;
}

export interface RecentOrderItem {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  qrReferenceCode?: string | null;
  courseTitle: string;
  studentName: string;
  studentPhone: string;
  createdAt: string;
}

export interface MonthlyTrendItem {
  month: string;
  count: number;
}

export interface SystemHealthData {
  status: string;
  database: string;
  nodeEnv: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
}

export interface AnalyticsOverviewData {
  metrics: DashboardMetrics;
  recentStudents: RecentStudentItem[];
  recentOrders: RecentOrderItem[];
  monthlyTrends: MonthlyTrendItem[];
  systemHealth: SystemHealthData;
}

export interface StudentCourseProgressItem {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  thumbnailUrl: string;
  enrollmentStatus: string;
  enrolledAt: string;
  totalSubtopics: number;
  completedSubtopics: number;
  progressPercent: number;
  lastAccessedAt: string | null;
  lastAccessedLesson: string;
}

export interface StudentProgressData {
  student: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    city: string | null;
    state: string | null;
    registeredAt: string;
  };
  courses: StudentCourseProgressItem[];
  codingStats: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    avgScore: number;
  };
  mcqStats: {
    totalAttempts: number;
    passedAttempts: number;
    avgScore: number;
  };
}

export interface AuditLogItem {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLogItem[];
  distinctActions: string[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const adminAnalyticsService = {
  async getOverview(): Promise<AnalyticsOverviewData> {
    const res = await api.get<AnalyticsOverviewData>('/admin/analytics/overview');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to fetch analytics overview');
    }
    return res.data;
  },

  async getStudentProgress(studentId: string): Promise<StudentProgressData> {
    const res = await api.get<StudentProgressData>(`/admin/students/${studentId}/progress`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to fetch student progress');
    }
    return res.data;
  },

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  }): Promise<AuditLogsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const res = await api.get<any>(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
    if (!res.success) {
      throw new Error(res.message || 'Failed to fetch audit logs');
    }
    return {
      data: res.data || [],
      distinctActions: (res as any).distinctActions || [],
      meta: (res as any).meta || { total: 0, page: 1, limit: 25, totalPages: 1 },
    };
  },
};
