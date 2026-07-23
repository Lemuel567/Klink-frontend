import { apiClient } from './client';

export interface AnalyticsDashboard {
  months: string[];        // ["2026-02", ...] oldest → newest
  attendance: number[];
  giving: number[];
  newMembers: number[];
  totalMembers: number;
  activeMembers: number;
  thisMonthAttendance: number;
  thisMonthGiving: number;
  attendanceGrowthPct: number;
  givingGrowthPct: number;
  newMembersThisMonth: number;
}

export const analyticsApi = {
  // Pastor / Elder: attendance, giving and membership trends
  getDashboard: (months = 6) =>
    apiClient.get<AnalyticsDashboard>('/analytics/dashboard', { params: { months } }).then((r) => r.data),
};
