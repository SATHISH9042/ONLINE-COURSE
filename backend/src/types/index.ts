export type UserRole = 'STUDENT' | 'ADMIN';

export type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  phone: string;
  email: string | null;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  token_version: number;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  userId: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  tokenVersion: number;
}
