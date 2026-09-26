import { api } from './api';
import { ApiResponse, User } from '../types';

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  city?: string;
  state?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AuthSuccessData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<ApiResponse<any>> {
    return api.post('/auth/register', payload);
  },

  async login(payload: LoginPayload): Promise<ApiResponse<AuthSuccessData>> {
    return api.post<AuthSuccessData>('/auth/login', payload);
  },

  async logout(refreshToken?: string): Promise<ApiResponse<any>> {
    return api.post('/auth/logout', { refreshToken });
  },

  async getMe(): Promise<ApiResponse<User>> {
    return api.get<User>('/auth/me');
  },
};
