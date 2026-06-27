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

  // Backend: multipart/form-data with @RequestPart title, body, flyer (optional file)
  create: (title: string, body: string, flyer?: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('title', title);
    form.append('body', body);
    if (flyer) {
      form.append('flyer', { uri: flyer.uri, name: flyer.name, type: flyer.type } as any);
    }
    return apiClient
      .post<Announcement>('/announcements', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  delete: (id: string) => apiClient.delete(`/announcements/${id}`).then((r) => r.data),
};
