import { apiClient } from './client';

export interface Group {
  id: string;
  groupName: string;
  description?: string;
  photoUrl?: string;
  duesAmount?: number;
  groupAdminId?: string;
  groupAdminName?: string;
  groupFinSecId?: string;
  groupFinSecName?: string;
  status: 'DRAFT' | 'ACTIVE';
  memberCount: number;
  createdBy: string;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  content: string;
  postedBy: string;
  createdAt: string;
}

export interface GroupMember {
  memberId: string;
  fullName: string;
  phone?: string;
  photoUrl?: string;
  isAdmin: boolean;
  isFinSec: boolean;
  joinedAt: string;
}

export interface DuesStatus {
  memberId: string;
  memberName: string;
  paid: boolean;
  amountPaid?: number;
}

export interface GroupPayment {
  id: string;
  memberId?: string;
  memberName?: string;
  amount: number;
  paymentType: string;
  paymentMonth?: string;
  paymentDate?: string;
  status: string;
  createdAt: string;
}

export interface GroupFinanceSummary {
  totalCollected: number;
  thisMonthCollected: number;
  currentMonth: string;
  memberCount: number;
  paidThisMonth: number;
  duesAmount?: number;
  recentPayments: GroupPayment[];
}

export interface GroupPage {
  content: Group[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface GroupMessagePage {
  content: GroupMessage[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const groupsApi = {
  // Leadership (Pastor / Elder / Manager): create group; may appoint the admin
  create: (body: {
    groupName: string;
    description?: string;
    duesAmount?: number;
    groupAdminId?: string;
  }) => apiClient.post<Group>('/groups', body).then((r) => r.data),

  // List groups (leaders see all; everyone else sees groups they belong to)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<GroupPage>('/groups', { params }).then((r) => r.data),

  // Single group detail
  get: (groupId: string) => apiClient.get<Group>(`/groups/${groupId}`).then((r) => r.data),

  // Group admin / leadership: edit name/description/dues
  update: (
    groupId: string,
    body: { groupName?: string; description?: string; duesAmount?: number },
  ) => apiClient.put<Group>(`/groups/${groupId}`, body).then((r) => r.data),

  // Group admin / leadership: set the group's profile photo
  uploadPhoto: (groupId: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return apiClient
      .post<Group>(`/groups/${groupId}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  // Leadership: appoint / change the group admin
  assignAdmin: (groupId: string, memberId: string) =>
    apiClient.put<Group>(`/groups/${groupId}/admin`, { memberId }).then((r) => r.data),

  // Group admin: appoint a group member as financial secretary
  assignFinSec: (groupId: string, memberId: string) =>
    apiClient.put<Group>(`/groups/${groupId}/fin-sec`, { memberId }).then((r) => r.data),

  // Group admin: add a member
  addMember: (groupId: string, memberId: string) =>
    apiClient.post<Group>(`/groups/${groupId}/members`, { memberId }).then((r) => r.data),

  // Group admin: remove a member
  removeMember: (groupId: string, memberId: string) =>
    apiClient.delete(`/groups/${groupId}/members/${memberId}`).then((r) => r.data),

  // Group roster (name + phone + photo only)
  getMembers: (groupId: string) =>
    apiClient.get<GroupMember[]>(`/groups/${groupId}/members`).then((r) => r.data),

  // Group Admin: post information to the group (notifies all members)
  postMessage: (groupId: string, content: string) =>
    apiClient.post<GroupMessage>(`/groups/${groupId}/messages`, { content }).then((r) => r.data),

  // Group members / Group Admin: get messages (paginated)
  getMessages: (groupId: string, params?: { page?: number; size?: number }) =>
    apiClient
      .get<GroupMessagePage>(`/groups/${groupId}/messages`, { params })
      .then((r) => r.data),

  // Group Financial Secretary: record dues payment
  recordDues: (
    groupId: string,
    body: { memberId: string; amount: number; paymentMonth: string; paymentDate: string },
  ) => apiClient.post(`/groups/${groupId}/dues/pay`, body).then((r) => r.data),

  // Group Fin Sec / Group Admin: dues status for a month (YYYY-MM)
  getDuesStatus: (groupId: string, month: string) =>
    apiClient
      .get<DuesStatus[]>(`/groups/${groupId}/dues`, { params: { month } })
      .then((r) => r.data),

  // Manual trigger: generate dues records for a month (YYYY-MM)
  generateDues: (groupId: string, month: string) =>
    apiClient
      .post<{ message: string }>(`/groups/${groupId}/dues/generate`, null, { params: { month } })
      .then((r) => r.data),

  // Group Fin Sec / Group Admin: group finance summary (separate from church money)
  getFinanceSummary: (groupId: string) =>
    apiClient.get<GroupFinanceSummary>(`/groups/${groupId}/finances/summary`).then((r) => r.data),
};
