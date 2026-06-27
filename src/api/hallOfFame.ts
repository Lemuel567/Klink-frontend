import { apiClient } from './client';

export interface HallOfFameEntry {
  id: string;
  memberId?: string;
  memberName?: string;
  title: string;
  description?: string;
  photoUrl?: string;
  postedBy: string;
  createdAt: string;
}

export interface HallOfFamePage {
  content: HallOfFameEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const hallOfFameApi = {
  // Pastor / Elder / Manager: create entry — multipart/form-data
  create: (params: {
    title: string;
    description?: string;
    memberId?: string;
    photo?: { uri: string; name: string; type: string };
  }) => {
    const form = new FormData();
    form.append('title', params.title);
    if (params.description) form.append('description', params.description);
    if (params.memberId) form.append('memberId', params.memberId);
    if (params.photo) {
      form.append('photo', { uri: params.photo.uri, name: params.photo.name, type: params.photo.type } as any);
    }
    return apiClient
      .post<HallOfFameEntry>('/hall-of-fame', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // All: list entries (paginated)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<HallOfFamePage>('/hall-of-fame', { params }).then((r) => r.data),

  // Pastor / Elder / Manager: update entry — multipart/form-data
  update: (
    id: string,
    params: {
      title?: string;
      description?: string;
      memberId?: string;
      photo?: { uri: string; name: string; type: string };
    },
  ) => {
    const form = new FormData();
    if (params.title) form.append('title', params.title);
    if (params.description) form.append('description', params.description);
    if (params.memberId) form.append('memberId', params.memberId);
    if (params.photo) {
      form.append('photo', { uri: params.photo.uri, name: params.photo.name, type: params.photo.type } as any);
    }
    return apiClient
      .put<HallOfFameEntry>(`/hall-of-fame/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // Pastor / Elder / Manager: delete entry
  delete: (id: string) =>
    apiClient.delete(`/hall-of-fame/${id}`).then((r) => r.data),
};
