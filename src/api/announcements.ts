import { apiClient } from './client';

export type AnnouncementTargetType = 'ALL' | 'ROLES' | 'GROUPS' | 'MEMBERS' | 'CUSTOM';

export type ChurchRole =
  | 'PASTOR'
  | 'ELDER'
  | 'MANAGER'
  | 'FINANCIAL_SECRETARY'
  | 'GROUP_ADMIN'
  | 'GROUP_FINANCIAL_SECRETARY'
  | 'MEMBER';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  flyerUrl?: string;
  postedBy: string;
  createdAt: string;
  targetType: AnnouncementTargetType;
  targetRoles?: ChurchRole[];
  targetGroupIds?: string[];
  targetMemberIds?: string[];
  isTargeted: boolean;
  recipientCount: number;
}

export interface AnnouncementPage {
  content: Announcement[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface GroupSummary {
  id: string;
  groupName: string;
  memberCount: number;
}

export interface AnnouncementRecipient {
  memberId: string;
  fullName: string;
  role: ChurchRole;
  hasFcmToken: boolean;
  emailVerified: boolean;
}

export interface RecipientPage {
  content: AnnouncementRecipient[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface CreateAnnouncementParams {
  title: string;
  body: string;
  targetType?: AnnouncementTargetType;
  targetRoles?: ChurchRole[];
  targetGroupIds?: string[];
  targetMemberIds?: string[];
  flyer?: { uri: string; name: string; type: string };
}

export const announcementsApi = {
  // All announcements for the church (visible to everyone)
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<AnnouncementPage>('/announcements', { params }).then((r) => r.data),

  // Announcements targeted at the calling member's role / groups / direct
  listMy: (params?: { page?: number; size?: number }) =>
    apiClient.get<AnnouncementPage>('/announcements/my', { params }).then((r) => r.data),

  // Create a targeted announcement (multipart/form-data)
  create: (params: CreateAnnouncementParams) => {
    const form = new FormData();
    form.append('title', params.title);
    form.append('body', params.body);
    if (params.targetType) form.append('targetType', params.targetType);
    if (params.targetRoles?.length) form.append('targetRoles', JSON.stringify(params.targetRoles));
    if (params.targetGroupIds?.length) form.append('targetGroupIds', JSON.stringify(params.targetGroupIds));
    if (params.targetMemberIds?.length) form.append('targetMemberIds', JSON.stringify(params.targetMemberIds));
    if (params.flyer) {
      form.append('flyer', { uri: params.flyer.uri, name: params.flyer.name, type: params.flyer.type } as any);
    }
    return apiClient
      .post<Announcement>('/announcements', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // Update title/body only (targeting cannot change after send)
  patch: (id: string, body: { title?: string; body?: string }) =>
    apiClient.patch<Announcement>(`/announcements/${id}`, body).then((r) => r.data),

  // Who received a specific announcement (privileged roles only)
  recipients: (id: string, params?: { page?: number; size?: number }) =>
    apiClient.get<RecipientPage>(`/announcements/${id}/recipients`, { params }).then((r) => r.data),

  // All active groups — for the target group selector (privileged roles only)
  groups: () => apiClient.get<GroupSummary[]>('/announcements/groups').then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/announcements/${id}`).then((r) => r.data),
};

// Human-readable label for a target type
export function targetTypeLabel(type: AnnouncementTargetType): string {
  switch (type) {
    case 'ALL':     return 'Church-Wide';
    case 'ROLES':   return 'By Role';
    case 'GROUPS':  return 'By Group';
    case 'MEMBERS': return 'Specific Members';
    case 'CUSTOM':  return 'Custom';
  }
}

// Chip color for target badge
export function targetTypeColor(type: AnnouncementTargetType): string {
  switch (type) {
    case 'ALL':     return '#2D6A4F';  // green
    case 'ROLES':   return '#2D1B69';  // purple
    case 'GROUPS':  return '#4A90D9';  // blue
    case 'MEMBERS': return '#C9797A';  // rose gold
    case 'CUSTOM':  return '#F4A429';  // gold
  }
}
