import { apiClient } from './client';
import { MemberSummary } from './auth';

// Regular members receive the DIRECTORY view: id, fullName, phone, photoUrl
// only — every other field is null/absent (backend privacy rule, 2026-07-12).
export interface Member extends MemberSummary {
  phone?: string;
  dateOfBirth?: string;
  status?: 'ACTIVE' | 'DEACTIVATED';
  qrCodeValue?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberPage {
  content: Member[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const membersApi = {
  list: (params?: { page?: number; size?: number; status?: string; search?: string }) =>
    apiClient.get<MemberPage>('/members', { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<Member>(`/members/${id}`).then((r) => r.data),

  update: (
    id: string,
    body: Partial<{
      fullName: string;
      phone: string;
      email: string;
      dateOfBirth: string;
      category: string;
      address: string;
      baptismDate: string;
      membershipDate: string;
    }>,
  ) => apiClient.put<Member>(`/members/${id}`, body).then((r) => r.data),

  // Backend returns raw String (QR code value), not JSON
  getQr: (id: string) => apiClient.get<string>(`/members/${id}/qr`).then((r) => r.data),

  assignRole: (id: string, role: string) =>
    apiClient.put(`/members/${id}/role`, { role }).then((r) => r.data),

  deactivate: (id: string) => apiClient.post(`/members/${id}/deactivate`).then((r) => r.data),

  reactivate: (id: string) => apiClient.post(`/members/${id}/reactivate`).then((r) => r.data),

  registerOffline: (body: {
    fullName: string;
    phone?: string;
    dateOfBirth?: string;
    category?: string;
  }) => apiClient.post<Member>('/members/register', body).then((r) => r.data),

  // FCM token: PUT /members/me/fcm-token with { token }
  registerFcmToken: (token: string) =>
    apiClient.put('/members/me/fcm-token', { token }).then((r) => r.data),

  removeFcmToken: () =>
    apiClient.delete('/members/me/fcm-token').then((r) => r.data),

  // PATCH /members/me/phone — triggers re-verification of new number
  updatePhone: (phoneNumber: string) =>
    apiClient.patch<{ message: string }>('/members/me/phone', { phoneNumber }).then((r) => r.data),

  // POST /members/{id}/photo — multipart file upload
  uploadPhoto: (id: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return apiClient
      .post<string>(`/members/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
};
