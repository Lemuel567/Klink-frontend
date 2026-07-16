import { apiClient } from './client';

export interface Pledge {
  id: string;
  memberId: string;
  memberName: string;
  description?: string;
  amount: number;
  amountPaid: number;
  paidAt?: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  recordedBy: string;
  createdAt: string;
}

export interface PledgePayment {
  id: string;
  pledgeId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentDate?: string;
  recordedBy: string;
  createdAt: string;
}

export interface PledgePage {
  content: Pledge[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const pledgesApi = {
  // Financial Secretary: record a new pledge
  record: (body: { memberId: string; amount: number; description?: string }) =>
    apiClient.post<Pledge>('/pledges', body).then((r) => r.data),

  // Fin Sec / Pastor / Elder: all pledges (paginated)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<PledgePage>('/pledges', { params }).then((r) => r.data),

  // All: own pledges (paginated)
  getMe: (params?: { page?: number; size?: number }) =>
    apiClient.get<PledgePage>('/pledges/me', { params }).then((r) => r.data),

  // Financial Secretary: record a payment toward a pledge
  pay: (pledgeId: string, body: { amount: number; paymentDate?: string }) =>
    apiClient.put<PledgePayment>(`/pledges/${pledgeId}/pay`, body).then((r) => r.data),

  // Get payments for a specific pledge
  getPayments: (pledgeId: string) =>
    apiClient.get<PledgePayment[]>(`/pledges/${pledgeId}/payments`).then((r) => r.data),
};
