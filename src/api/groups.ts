import { apiClient } from './client';

export interface Group {
  id: string;
  groupName: string;
  description?: string;
  duesAmount?: number;
  groupAdminId?: string;
  groupAdminName?: string;
  groupFinSecId?: string;
  groupFinSecName?: string;
  status: 'DRAFT' | 'ACTIVE';
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

export interface DuesStatus {
  memberId: string;
  memberName: string;
  paid: boolean;
  amountPaid?: number;
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
  // Pastor / Elder: create group
  create: (body: {
    groupName: string;
    description?: string;
    duesAmount?: number;
    groupAdminId?: string;
    groupFinSecId?: string;
  }) => apiClient.post<Group>('/groups', body).then((r) => r.data),

  // Pastor / Elder: list all groups (paginated)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<GroupPage>('/groups', { params }).then((r) => r.data),

  // Pastor / Elder: add a member to a group
  addMember: (groupId: string, memberId: string) =>
    apiClient.post<Group>(`/groups/${groupId}/members`, { memberId }).then((r) => r.data),

  // Group Admin: post a message in the group
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
};
