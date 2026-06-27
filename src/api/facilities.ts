import { apiClient } from './client';

export interface Facility {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  facilityType: string;
  address?: string;
  capacity?: number;
  yearAcquired?: number;
  estimatedValue?: number;
  currency?: string;
  // Backend serializes FacilityCondition enum as "condition" (not "conditionStatus")
  condition: string;
  isActive: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  images?: FacilityImage[];
}

export interface FacilityImage {
  id: string;
  facilityId: string;
  churchId: string;
  imageUrl: string;
  caption?: string;
  isPrimary: boolean;
  uploadedBy: string;
  uploadedAt: string;
  sortOrder: number;
}

export interface FacilityDetailResponse {
  facility: Facility;
  images: FacilityImage[];
}

export interface FacilityPage {
  content: Facility[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const facilitiesApi = {
  list: (params?: {
    page?: number;
    size?: number;
    facilityType?: string;
    condition?: string;
    isActive?: boolean;
  }) => apiClient.get<FacilityPage>('/facilities', { params }).then((r) => r.data),

  // Backend returns FacilityDetailResponse: { facility, images }
  get: (id: string) => apiClient.get<FacilityDetailResponse>(`/facilities/${id}`).then((r) => r.data),

  create: (body: {
    name: string;
    facilityType: string;
    condition: string;
    description?: string;
    address?: string;
    capacity?: number;
    yearAcquired?: number;
    estimatedValue?: number;
    currency?: string;
    isActive?: boolean;
    notes?: string;
  }) => apiClient.post<Facility>('/facilities', body).then((r) => r.data),

  update: (
    id: string,
    body: Partial<{
      name: string;
      description: string;
      facilityType: string;
      address: string;
      capacity: number;
      yearAcquired: number;
      estimatedValue: number;
      currency: string;
      condition: string;
      isActive: boolean;
      notes: string;
    }>,
  ) => apiClient.put<Facility>(`/facilities/${id}`, body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/facilities/${id}`).then((r) => r.data),

  // JSON body: { imageUrl, caption?, isPrimary?, sortOrder? }
  addImage: (
    id: string,
    body: { imageUrl: string; caption?: string; isPrimary?: boolean; sortOrder?: number },
  ) => apiClient.post<FacilityImage>(`/facilities/${id}/images`, body).then((r) => r.data),

  getImages: (id: string) =>
    apiClient.get<FacilityImage[]>(`/facilities/${id}/images`).then((r) => r.data),

  deleteImage: (facilityId: string, imageId: string) =>
    apiClient.delete(`/facilities/${facilityId}/images/${imageId}`).then((r) => r.data),

  setPrimaryImage: (facilityId: string, imageId: string) =>
    apiClient.put(`/facilities/${facilityId}/images/${imageId}/primary`).then((r) => r.data),
};
