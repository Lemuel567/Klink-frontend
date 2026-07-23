import { apiClient } from './client';
import type { Member, MemberPage } from './members';

export interface Payment {
  id: string;
  paymentType: 'OFFERING' | 'TITHE' | 'WELFARE' | 'DUES' | 'SPECIAL_CONTRIBUTION';
  status?: 'CONFIRMED' | 'PENDING';
  amount: number;
  paymentMonth?: string;
  paymentDate: string;
  memberId?: string;
  memberName?: string;
  recordedBy: string;
  createdAt: string;
}

export interface PaymentPage {
  content: Payment[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface CollectionsLine {
  type: 'OFFERING' | 'TITHE' | 'WELFARE' | 'SPECIAL_CONTRIBUTION';
  manual: number;   // recorded by hand (cash counted)
  online: number;   // taken automatically through the app
  total: number;
}

export interface CollectionsSummary {
  from: string;
  to: string;
  lines: CollectionsLine[];
  manualTotal: number;
  onlineTotal: number;
  grandTotal: number;
}

export { Member, MemberPage };

export const givingApi = {
  // FinSec / Pastor / Elder: reconcile collections (manual + app) for a day or
  // period. No dates → current month; a single date (from=to) → one service day.
  getCollectionsSummary: (params?: { from?: string; to?: string }) =>
    apiClient.get<CollectionsSummary>('/finances/summary', { params }).then((r) => r.data),

  // Backend: { serviceDate: LocalDate, amount: BigDecimal } — no paymentMonth
  recordOffering: (body: { serviceDate: string; amount: number }) =>
    apiClient.post<Payment>('/finances/offering', body).then((r) => r.data),

  recordTithe: (body: {
    memberId: string;
    amount: number;
    paymentDate: string;
    paymentMonth: string;
    momoReference?: string;
  }) => apiClient.post<Payment>('/finances/tithe', body).then((r) => r.data),

  // Returns List<PaymentResponse> (array, not single item)
  recordWelfare: (body: {
    memberId: string;
    amountPaid: number;
    paymentDate: string;
    paymentMonth: string;
    momoReference?: string;
  }) => apiClient.post<Payment[]>('/finances/welfare', body).then((r) => r.data),

  // Returns Page<MemberResponse> — members who have NOT paid welfare for the month
  getWelfareDefaulters: (month: string, params?: { page?: number; size?: number }) =>
    apiClient
      .get<MemberPage>('/finances/welfare/defaulters', { params: { month, ...params } })
      .then((r) => r.data),

  // Returns 204 No Content
  remindWelfareDefaulters: (month: string) =>
    apiClient.post('/finances/welfare/remind', null, { params: { month } }).then((r) => r.data),

  getMyPayments: (params?: { page?: number; size?: number }) =>
    apiClient.get<PaymentPage>('/finances/me', { params }).then((r) => r.data),
};
