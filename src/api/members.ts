import { apiClient } from './client';
import { MemberSummary } from './auth';

export interface Member extends MemberSummary {
  phone?: string;
  dateOfBirth?: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  qrCodeValue: string;
  category: string;
  createdAt: string;
  updatedAt: string;
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
    body: Partial<Pick<Member, 'fullName' | 'phone' | 'dateOfBirth' | 'category' | 'photoUrl'>>,
  ) => apiClient.put<Member>(`/members/${id}`, body).then((r) => r.data),

  getQr: (id: string) => apiClient.get<{ qrCodeValue: string }>(`/members/${id}/qr`).then((r) => r.data),

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
};
