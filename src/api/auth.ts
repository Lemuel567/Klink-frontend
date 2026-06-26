import { apiClient } from './client';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  member: MemberSummary;
}

export interface MemberSummary {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  churchId: string;
  photoUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasSmartphone: boolean;
  category: string;
}

export const authApi = {
  registerChurch: (body: {
    churchName: string;
    location: string;
    denomination?: string;
    contactPhone?: string;
    contactEmail?: string;
    pastorName: string;
    email: string;
    password: string;
  }) => apiClient.post<LoginResponse>('/auth/register-church', body).then((r) => r.data),

  register: (body: {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    password: string;
    churchCode: string;
    hasSmartphone?: boolean;
  }) => apiClient.post<LoginResponse>('/auth/register', body).then((r) => r.data),

  login: (body: { email?: string; phoneNumber?: string; password: string }) =>
    apiClient.post<LoginResponse>('/auth/login', body).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    apiClient.post('/auth/reset-password', body).then((r) => r.data),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/auth/change-password', body).then((r) => r.data),

  verifyEmail: (body: { email: string; code: string }) =>
    apiClient.post('/auth/verify-email', body).then((r) => r.data),

  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }).then((r) => r.data),

  verifyPhone: (code: string) =>
    apiClient.post('/auth/verify-phone', { code }).then((r) => r.data),

  resendPhoneVerification: () =>
    apiClient.post('/auth/resend-phone-verification').then((r) => r.data),

  updatePhone: (phoneNumber: string) =>
    apiClient.put('/auth/phone', { phoneNumber }).then((r) => r.data),

  registerFcmToken: (fcmToken: string) =>
    apiClient.post('/auth/fcm-token', { fcmToken }).then((r) => r.data),
};
