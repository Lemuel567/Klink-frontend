import { apiClient } from './client';

export interface Poll {
  id: string;
  question: string;
  options: string[];
  closesAt?: string;
  open: boolean;
  voted: boolean;
  /** The option THIS member currently holds, or null/undefined if not voted. */
  votedOption?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PollResults {
  pollId: string;
  question: string;
  totalVotes: number;
  results: Array<{
    option: string;
    votes: number;
    percentage: number;
  }>;
}

export interface PollPage {
  content: Poll[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const pollsApi = {
  // Pastor / Manager ONLY: create poll (immutable once created — no edit API)
  create: (body: { question: string; options: string[]; closesAt?: string }) =>
    apiClient.post<Poll>('/polls', body).then((r) => r.data),

  // All: list polls (paginated)
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<PollPage>('/polls', { params }).then((r) => r.data),

  // All: cast OR change a vote (one row per member; open polls can be changed)
  vote: (pollId: string, selectedOption: string) =>
    apiClient.post<Poll>(`/polls/${pollId}/vote`, { selectedOption }).then((r) => r.data),

  // ALL members: aggregate vote results (anonymous — counts + percentages only)
  getResults: (pollId: string) =>
    apiClient.get<PollResults>(`/polls/${pollId}/results`).then((r) => r.data),

  // Pastor / Elder / Manager: delete a poll
  delete: (pollId: string) =>
    apiClient.delete(`/polls/${pollId}`).then((r) => r.data),
};
