import { apiClient } from './client';

export interface Project {
  id: string;
  churchId: string;
  title: string;
  description?: string;
  projectType: string;
  status: string;
  targetAmount: number;
  amountRaised: number;
  currency: string;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  location?: string;
  contractor?: string;
  facilityId?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPage {
  content: Project[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface Contribution {
  id: string;
  projectId: string;
  memberId?: string;
  memberName?: string;
  churchId: string;
  amount: number;
  currency: string;
  contributionDate: string;
  paymentMethod: string;
  recordedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface ContributionSummary {
  totalAmount: number;
  contributorCount: number;
  currency: string;
}

export const projectsApi = {
  list: (params?: { page?: number; size?: number; status?: string; projectType?: string }) =>
    apiClient.get<ProjectPage>('/projects', { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (body: Partial<Project>) =>
    apiClient.post<Project>('/projects', body).then((r) => r.data),

  update: (id: string, body: Partial<Project>) =>
    apiClient.put<Project>(`/projects/${id}`, body).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient.put(`/projects/${id}/status`, { status }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/projects/${id}`).then((r) => r.data),

  getDashboard: () => apiClient.get('/projects/dashboard').then((r) => r.data),

  getContributions: (projectId: string, params?: { page?: number; size?: number }) =>
    apiClient.get<{ content: Contribution[] }>(`/projects/${projectId}/contributions`, { params }).then((r) => r.data),

  getContributionSummary: (projectId: string) =>
    apiClient.get<ContributionSummary>(`/projects/${projectId}/contributions/summary`).then((r) => r.data),

  recordContribution: (
    projectId: string,
    body: {
      memberId: string;
      amount: number;
      contributionDate: string;
      paymentMethod: string;
      notes?: string;
    },
  ) => apiClient.post<Contribution>(`/projects/${projectId}/contributions`, body).then((r) => r.data),

  getMyContributions: (params?: { page?: number; size?: number }) =>
    apiClient.get('/projects/my-contributions', { params }).then((r) => r.data),
};
