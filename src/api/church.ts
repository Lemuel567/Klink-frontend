import { apiClient } from './client';

export interface Church {
  id: string;
  churchName: string;
  location?: string;
  denomination?: string;
  churchCode: string;
  welfareAmount?: number;
  contactPhone?: string;
  contactEmail?: string;
  photoUrl?: string;
  createdAt: string;
  deletedAt?: string;
  scheduledDeletionAt?: string;
}

export const churchApi = {
  getSettings: () => apiClient.get<Church>('/church/settings').then((r) => r.data),

  updateSettings: (
    body: Partial<Pick<Church, 'churchName' | 'location' | 'contactPhone' | 'contactEmail' | 'welfareAmount'>>,
  ) => apiClient.put<Church>('/church/settings', body).then((r) => r.data),

  // Pastor / Elder / Manager: upload church photo — @RequestParam("file")
  uploadPhoto: (file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return apiClient
      .post<string>('/church/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // Backend returns MessageResponse: "Church code updated. New code: XXX"
  regenerateCode: () =>
    apiClient.post<{ message: string }>('/church/regenerate-code').then((r) => r.data),

  deleteChurch: () => apiClient.delete<Church>('/church').then((r) => r.data),

  restoreChurch: () => apiClient.post<Church>('/church/restore').then((r) => r.data),
};
