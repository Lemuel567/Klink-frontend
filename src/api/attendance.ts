import { apiClient } from './client';

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  serviceName: string;
  serviceDate: string;
  timeOfScan?: string;
  method: 'QR_SCAN' | 'MANUAL';
  status: 'PRESENT' | 'ABSENT';
}

export interface AttendanceQrResponse {
  qrPayload: string;
  serviceName: string;
  serviceDate: string;
}

export interface AttendancePage {
  content: AttendanceRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const attendanceApi = {
  // Pastor/Elder/Manager: generate QR session — returns qrPayload + serviceName + serviceDate
  generateQr: () =>
    apiClient.post<AttendanceQrResponse>('/attendance/generate-qr').then((r) => r.data),

  // All: self check-in by scanning the QR payload
  scan: (qrPayload: string) =>
    apiClient.post<AttendanceRecord>('/attendance/scan', { qrPayload }).then((r) => r.data),

  // Pastor/Elder/Manager: manually mark a member present
  markManual: (body: { memberId: string; serviceName: string; serviceDate: string }) =>
    apiClient.post<AttendanceRecord>('/attendance/manual', body).then((r) => r.data),

  // Pastor/Elder/Manager: all attendance records (paginated, default size 50)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<AttendancePage>('/attendance', { params }).then((r) => r.data),

  // All: own attendance history (paginated)
  getMe: (params?: { page?: number; size?: number }) =>
    apiClient.get<AttendancePage>('/attendance/me', { params }).then((r) => r.data),
};
