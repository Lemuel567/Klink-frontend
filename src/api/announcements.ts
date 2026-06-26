import { apiClient } from './client';

export interface Announcement {
  id: string;
  churchId: string;
  title: string;
  body: string;
  flyerUrl?: string;
  postedBy: string;
  createdAt: string;
}

export interface AnnouncementPage {
  content: Announcement[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const announcementsApi = {
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<AnnouncementPage>('/announcements', { params }).then((r) => r.data),

  create: (body: { title: string; body: string; flyerUrl?: string }) =>
    apiClient.post<Announcement>('/announcements', body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/announcements/${id}`).then((r) => r.data),
};
