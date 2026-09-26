export type UserRole = 'STUDENT' | 'ADMIN';

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
