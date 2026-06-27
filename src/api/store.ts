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

  // momoReference is @NotBlank — required by backend
  buyItem: (body: { itemId: string; momoReference: string; datePaid?: string }) =>
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
