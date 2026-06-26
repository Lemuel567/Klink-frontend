import { apiClient } from './client';

export interface Payment {
  id: string;
  churchId: string;
  memberId?: string;
  memberName?: string;
  groupId?: string;
  paymentType: 'OFFERING' | 'TITHE' | 'WELFARE' | 'DUES' | 'SPECIAL_CONTRIBUTION';
  amount: number;
  paymentMonth: string;
  paymentDate: string;
  status: 'CONFIRMED' | 'PENDING';
  recordedBy: string;
  createdAt: string;
}

export interface PaymentPage {
  content: Payment[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const givingApi = {
  recordOffering: (body: { amount: number; paymentDate: string; paymentMonth: string }) =>
    apiClient.post<Payment>('/finances/offering', body).then((r) => r.data),

  recordTithe: (body: {
    memberId: string;
    amount: number;
    paymentDate: string;
    paymentMonth: string;
  }) => apiClient.post<Payment>('/finances/tithe', body).then((r) => r.data),

  recordWelfare: (body: {
    memberId: string;
    amount: number;
    paymentDate: string;
    paymentMonth: string;
  }) => apiClient.post<Payment>('/finances/welfare', body).then((r) => r.data),

  getWelfareDefaulters: (params?: { page?: number; size?: number }) =>
    apiClient.get<PaymentPage>('/finances/welfare/defaulters', { params }).then((r) => r.data),

  remindWelfareDefaulters: () =>
    apiClient.post('/finances/welfare/remind').then((r) => r.data),

  getMyPayments: (params?: { page?: number; size?: number }) =>
    apiClient.get<PaymentPage>('/finances/me', { params }).then((r) => r.data),
};
