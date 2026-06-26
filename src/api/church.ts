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

  regenerateCode: () =>
    apiClient.post<{ churchCode: string }>('/church/regenerate-code').then((r) => r.data),

  deleteChurch: () => apiClient.delete('/church').then((r) => r.data),

  restoreChurch: () => apiClient.post('/church/restore').then((r) => r.data),
};
