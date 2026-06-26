import { apiClient } from './client';

export interface ChurchEvent {
  id: string;
  churchId: string;
  title: string;
  description?: string;
  eventDate: string;
  reminderSent: boolean;
  createdBy: string;
  createdAt: string;
}

export interface EventPage {
  content: ChurchEvent[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const eventsApi = {
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<EventPage>('/events', { params }).then((r) => r.data),

  create: (body: { title: string; description?: string; eventDate: string }) =>
    apiClient.post<ChurchEvent>('/events', body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/events/${id}`).then((r) => r.data),
};
