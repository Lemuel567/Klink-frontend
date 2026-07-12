import { apiClient } from './client';

export type PrayerVisibility = 'PUBLIC' | 'PRIVATE';
export type PrayerStatus = 'OPEN' | 'ANSWERED';

export interface PrayerRequest {
  id: string;
  memberId: string;
  memberName: string | null;
  title: string;
  content: string;
  visibility: PrayerVisibility;
  status: PrayerStatus;
  leaderResponse: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerRequestPage {
  content: PrayerRequest[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const prayerRequestsApi = {
  // Members see PUBLIC + their own PRIVATE; Pastor/Elder see everything
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<PrayerRequestPage>('/prayer-requests', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<PrayerRequest>(`/prayer-requests/${id}`).then((r) => r.data),

  // Any authenticated member may submit
  create: (body: { title: string; content: string; visibility: PrayerVisibility }) =>
    apiClient.post<PrayerRequest>('/prayer-requests', body).then((r) => r.data),

  // Pastor/Elder only — marks the request ANSWERED
  respond: (id: string, body: { response: string }) =>
    apiClient.put<PrayerRequest>(`/prayer-requests/${id}/respond`, body).then((r) => r.data),

  // Author or Pastor/Elder — soft delete
  delete: (id: string) => apiClient.delete(`/prayer-requests/${id}`).then((r) => r.data),
};
