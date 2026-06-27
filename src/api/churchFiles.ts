import { apiClient } from './client';

export interface ChurchFile {
  id: string;
  title: string;
  category: string;
  language?: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ChurchFilePage {
  content: ChurchFile[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const churchFilesApi = {
  // Pastor / Elder / Manager: upload PDF — multipart/form-data
  // Max 30MB, PDF only, max 10 files per church
  upload: (params: {
    file: { uri: string; name: string; type: string };
    title: string;
    category: string;
    language?: string;
  }) => {
    const form = new FormData();
    form.append('file', { uri: params.file.uri, name: params.file.name, type: params.file.type } as any);
    form.append('title', params.title);
    form.append('category', params.category);
    if (params.language) form.append('language', params.language);
    return apiClient
      .post<ChurchFile>('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // All: list files; filterable by category and language
  getAll: (params?: { page?: number; size?: number; category?: string; language?: string }) =>
    apiClient.get<ChurchFilePage>('/files', { params }).then((r) => r.data),

  // Pastor / Elder / Manager: delete a file
  delete: (id: string) =>
    apiClient.delete(`/files/${id}`).then((r) => r.data),
};
