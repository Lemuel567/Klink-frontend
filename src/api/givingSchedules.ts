import { apiClient } from './client';
import { OnlinePaymentType } from './payments';

export interface GivingSchedule {
  id: string;
  paymentType: OnlinePaymentType;
  amount: number;
  dayOfMonth: number;
  active: boolean;
  lastRunMonth?: string | null;
  createdAt: string;
}

export const givingSchedulesApi = {
  list: () => apiClient.get<GivingSchedule[]>('/giving-schedules').then((r) => r.data),

  create: (body: { paymentType: OnlinePaymentType; amount: number; dayOfMonth: number }) =>
    apiClient.post<GivingSchedule>('/giving-schedules', body).then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    apiClient.patch<GivingSchedule>(`/giving-schedules/${id}`, { active }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/giving-schedules/${id}`).then((r) => r.data),
};
