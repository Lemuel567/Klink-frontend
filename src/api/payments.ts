import { apiClient } from './client';

export type OnlinePaymentType =
  | 'TITHE'
  | 'OFFERING'
  | 'WELFARE'
  | 'BUILDING_FUND'
  | 'MISSIONS'
  | 'PROJECT_CONTRIBUTION'
  | 'OTHER';

export type OnlinePaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABANDONED';

export interface InitiatePaymentResponse {
  authorizationUrl: string;
  reference: string;
  amount: number;
  currency: string;
}

export interface OnlinePayment {
  id: string;
  memberId: string;
  memberName: string | null;
  amount: number;
  currency: string;
  paymentType: OnlinePaymentType;
  status: OnlinePaymentStatus;
  channel: string | null;
  paystackReference: string;
  description: string | null;
  projectId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OnlinePaymentPage {
  content: OnlinePayment[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface PaymentSummary {
  totalThisMonth: number;
  totalThisYear: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  countByPaymentType: Record<string, number>;
  mobileMoneyCount: number;
  cardCount: number;
  recentPayments: OnlinePayment[];
}

export const paymentsApi = {
  // Start an online payment — returns the Paystack checkout URL to open in the browser
  initiate: (body: {
    amount: number;
    paymentType: OnlinePaymentType;
    description?: string;
    projectId?: string;
  }) => apiClient.post<InitiatePaymentResponse>('/payments/initiate', body).then((r) => r.data),

  // Verify with Paystack; on success the backend records the giving/ledger entry
  verify: (reference: string) =>
    apiClient.get<OnlinePayment>(`/payments/verify/${reference}`).then((r) => r.data),

  // Members see their own history; leadership sees all
  history: (params?: { page?: number; size?: number }) =>
    apiClient.get<OnlinePaymentPage>('/payments/history', { params }).then((r) => r.data),

  // Pastor / Elder / Manager / Financial Secretary only
  summary: () => apiClient.get<PaymentSummary>('/payments/summary').then((r) => r.data),

  get: (id: string) => apiClient.get<OnlinePayment>(`/payments/${id}`).then((r) => r.data),
};

export function paymentTypeLabel(type: OnlinePaymentType): string {
  switch (type) {
    case 'TITHE':                return 'Tithe';
    case 'OFFERING':             return 'Offering';
    case 'WELFARE':              return 'Welfare';
    case 'BUILDING_FUND':        return 'Building Fund';
    case 'MISSIONS':             return 'Missions';
    case 'PROJECT_CONTRIBUTION': return 'Project Contribution';
    case 'OTHER':                return 'Giving';
  }
}
