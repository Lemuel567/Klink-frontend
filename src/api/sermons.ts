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

  get: (id: string) => apiClient.get<Sermon>(`/sermons/${id}`).then((r) => r.data),

  // Backend: multipart/form-data with @RequestPart fields; audio is an optional audio file
  create: (params: {
    preacher: string;
    title: string;
    sermonDate: string;
    memoryVerse?: string;
    scripture?: string;
    notes?: string;
    audio?: { uri: string; name: string; type: string };
  }) => {
    const form = new FormData();
    form.append('preacher', params.preacher);
    form.append('title', params.title);
    form.append('sermonDate', params.sermonDate);
    if (params.memoryVerse) form.append('memoryVerse', params.memoryVerse);
    if (params.scripture) form.append('scripture', params.scripture);
    if (params.notes) form.append('notes', params.notes);
    if (params.audio) {
      form.append('audio', { uri: params.audio.uri, name: params.audio.name, type: params.audio.type } as any);
    }
    return apiClient
      .post<Sermon>('/sermons', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  delete: (id: string) => apiClient.delete(`/sermons/${id}`).then((r) => r.data),

  // AI-assisted drafting: expands brief notes into a detailed summary.
  // Nothing is saved server-side — the caller reviews/edits before posting.
  generateNotes: (params: {
    title: string;
    preacher?: string;
    memoryVerse?: string;
    scripture?: string;
    notes: string;
  }) =>
    apiClient
      .post<{ generatedNotes: string }>('/sermons/generate-notes', params)
      .then((r) => r.data.generatedNotes),
};
