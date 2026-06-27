import { apiClient } from './client';

export interface Devotional {
  id: string;
  title: string;
  content: string;
  devotionalDate: string;
  postedBy: string;
  createdAt: string;
}

export interface DevotionalPage {
  content: Devotional[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const devotionalsApi = {
  // Pastor / Elder / Manager: post a devotional
  create: (body: { title: string; content: string; devotionalDate: string }) =>
    apiClient.post<Devotional>('/devotionals', body).then((r) => r.data),

  // All: list devotionals (paginated)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<DevotionalPage>('/devotionals', { params }).then((r) => r.data),

  // Pastor / Elder / Manager: delete a devotional
  delete: (id: string) =>
    apiClient.delete(`/devotionals/${id}`).then((r) => r.data),
};
