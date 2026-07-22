import { apiClient } from './client';

export interface MediaUploadResponse {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const mediaApi = {
  // Pastor / Elder / Manager: upload an image
  // Validates magic bytes; JPEG/PNG/WebP/HEIC only; max 10MB
  // Returns imageUrl to use in other API calls (facilities, projects, etc.)
  upload: (
    file: { uri: string; name: string; type: string },
    folder?: string,
  ) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return apiClient
      .post<MediaUploadResponse>('/media/upload', form, {
        params: folder ? { folder } : undefined,
        headers: { 'Content-Type': 'multipart/form-data' },
        // File uploads get double the normal timeout — a photo through a free
        // tunnel can legitimately take over a minute.
        timeout: 120_000,
      })
      .then((r) => r.data);
  },
};
