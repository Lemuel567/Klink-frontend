import { apiClient } from './client';

export interface GalleryPhoto {
  id: string;
  photoUrl: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface GalleryPage {
  content: GalleryPhoto[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const galleryApi = {
  // Manager: upload photo — multipart/form-data with @RequestPart photo + optional caption
  upload: (photo: { uri: string; name: string; type: string }, caption?: string) => {
    const form = new FormData();
    form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as any);
    if (caption) form.append('caption', caption);
    return apiClient
      .post<GalleryPhoto>('/gallery', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // All: list photos (paginated)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<GalleryPage>('/gallery', { params }).then((r) => r.data),
};
