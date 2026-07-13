import { apiClient } from './client';

export interface StoreItem {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category?: string;
  photoUrl?: string;
  photoUrls?: string[];
  status: 'AVAILABLE' | 'SOLD_OUT';
  createdBy: string;
  createdAt: string;
}

export interface StorePayment {
  id: string;
  memberId: string;
  memberName?: string;
  itemId: string;
  itemName?: string;
  amount: number;
  datePaid: string;
  collectionStatus: 'AWAITING' | 'COLLECTED';
  collectedBy?: string;
  collectedAt?: string;
}

export interface StoreItemPage {
  content: StoreItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface StorePaymentPage {
  content: StorePayment[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const storeApi = {
  // JSON create/update (2026-07-12): photos pre-uploaded via mediaApi.upload,
  // URLs passed in photoUrls — supports multiple pictures per item
  createItemJson: (body: {
    name: string;
    description?: string;
    price: number;
    quantity: number;
    category?: string;
    photoUrls?: string[];
  }) => apiClient.post<StoreItem>('/store/items', body).then((r) => r.data),

  updateItemJson: (
    id: string,
    body: Partial<{
      name: string;
      description: string;
      price: number;
      quantity: number;
      category: string;
      photoUrls: string[];
    }>,
  ) => apiClient.put<StoreItem>(`/store/items/${id}`, body).then((r) => r.data),

  // Manager: create item via multipart/form-data with individual @RequestPart fields
  createItem: (formData: FormData) =>
    apiClient
      .post<StoreItem>('/store/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  // Manager: update item via multipart/form-data
  updateItem: (id: string, formData: FormData) =>
    apiClient
      .put<StoreItem>(`/store/items/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  listItems: (params?: { page?: number; size?: number }) =>
    apiClient.get<StoreItemPage>('/store/items', { params }).then((r) => r.data),

  // momoReference required for member self-purchases; FinSec may omit it (cash)
  // and may pass memberId to record a sale ON BEHALF OF that member
  buyItem: (body: { itemId: string; momoReference?: string; datePaid?: string; memberId?: string }) =>
    apiClient.post<StorePayment>('/store/pay', body).then((r) => r.data),

  // Manager: mark as collected
  collectPayment: (paymentId: string) =>
    apiClient.put<StorePayment>(`/store/payments/${paymentId}/collect`).then((r) => r.data),

  // FinSec / Pastor / Elder: all payments
  listPayments: (params?: { page?: number; size?: number }) =>
    apiClient.get<StorePaymentPage>('/store/payments', { params }).then((r) => r.data),

  // All: own purchases
  myPurchases: (params?: { page?: number; size?: number }) =>
    apiClient.get<StorePaymentPage>('/store/my-purchases', { params }).then((r) => r.data),
};
