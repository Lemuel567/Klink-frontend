import { apiClient } from './client';

export interface Sermon {
  id: string;
  churchId: string;
  preacher: string;
  title: string;
  memoryVerse?: string;
  scripture?: string;
  sermonDate: string;
  audioUrl?: string;
  notes?: string;
  postedBy: string;
  createdAt: string;
}

export interface SermonPage {
  content: Sermon[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const sermonsApi = {
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<SermonPage>('/sermons', { params }).then((r) => r.data),

  create: (body: Omit<Sermon, 'id' | 'churchId' | 'postedBy' | 'createdAt'>) =>
    apiClient.post<Sermon>('/sermons', body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/sermons/${id}`).then((r) => r.data),
};
