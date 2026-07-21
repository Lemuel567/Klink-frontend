import { apiClient } from './client';
import { AUTH_TIMEOUT_MS } from '../utils/constants';

// Fail-fast config for public auth calls — see AUTH_TIMEOUT_MS
const FAST = { timeout: AUTH_TIMEOUT_MS };

// Matches backend AuthResponse exactly
export interface AuthResponse {
  token: string;
  refreshToken: string;
  memberId: string;
  churchId: string;
  churchCode: string;
  role: string;
  fullName: string;
  /** Sent by the backend so the profile shows email/photo right after login. */
  email?: string;
  photoUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface RegisterResponse {
  message: string;
}

export interface MemberSummary {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  churchId: string;
  churchCode?: string;
  photoUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasSmartphone?: boolean;
  category?: string;
}

export const authApi = {
  // Returns MessageResponse — tokens issued only after email verification
  registerChurch: (body: {
    churchName: string;
    location: string;
    denomination: string;   // @NotBlank — required
    contactPhone?: string;
    contactEmail?: string;
    pastorName: string;
    pastorEmail: string;
    pastorPassword: string;
    pastorPhone?: string;
  }) => apiClient.post<RegisterResponse>('/auth/register-church', body, FAST).then((r) => r.data),

  // Returns MessageResponse — tokens issued only after email verification
  register: (body: {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    password: string;
    churchCode: string;
    phone?: string;
  }) => apiClient.post<RegisterResponse>('/auth/register', body, FAST).then((r) => r.data),

  login: (body: { email?: string; phoneNumber?: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', body, FAST).then((r) => r.data),

  // Refresh returns full AuthResponse — note field is "token" not "accessToken"
  refresh: (refreshToken: string) =>
    apiClient
      .post<AuthResponse>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  // Returns AuthResponse — tokens issued here after email verification
  verifyEmail: (body: { email: string; code: string }) =>
    apiClient.post<AuthResponse>('/auth/verify-email', body, FAST).then((r) => r.data),

  resendVerification: (email: string) =>
    apiClient.post<RegisterResponse>('/auth/resend-verification', { email }, FAST).then((r) => r.data),

  // Returns AuthResponse with updated phoneVerified
  verifyPhone: (body: { phoneNumber: string; code: string }) =>
    apiClient.post<AuthResponse>('/auth/verify-phone', body, FAST).then((r) => r.data),

  resendPhoneVerification: (phoneNumber: string) =>
    apiClient.post<RegisterResponse>('/auth/resend-phone-verification', { phoneNumber }, FAST).then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post<RegisterResponse>('/auth/forgot-password', { email }, FAST).then((r) => r.data),

  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    apiClient.post('/auth/reset-password', body, FAST).then((r) => r.data),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/auth/change-password', body).then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),
};
