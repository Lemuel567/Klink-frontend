import { apiClient } from './client';

export type LiveStreamStatus = 'LIVE' | 'ENDED';
export type LiveStreamProvider = 'YOUTUBE' | 'FACEBOOK';

export interface LiveStream {
  id: string;
  title: string;
  /** Which platform is carrying the broadcast — picks the player to embed. */
  provider: LiveStreamProvider;
  /** YouTube: the 11-char video id. Facebook: the full video URL. */
  sourceRef: string;
  status: LiveStreamStatus;
  startedBy: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface LiveStreamPage {
  content: LiveStream[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const liveStreamsApi = {
  /**
   * The church's current broadcast. The backend answers 204 NO CONTENT when
   * nothing is live, which axios surfaces as an empty body — normalise both to
   * null so callers just check for a truthy stream.
   */
  getCurrent: () =>
    apiClient.get<LiveStream | ''>('/live-streams/live').then((r) =>
      r.status === 204 || !r.data ? null : (r.data as LiveStream),
    ),

  // Past broadcasts — still watchable as free YouTube recordings.
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<LiveStreamPage>('/live-streams', { params }).then((r) => r.data),

  // Pastor / Elder / Manager — notifies the whole church on success. The
  // backend detects YouTube vs Facebook from the link itself.
  start: (body: { title: string; streamUrl: string }) =>
    apiClient.post<LiveStream>('/live-streams', body).then((r) => r.data),

  end: (id: string) =>
    apiClient.put<LiveStream>(`/live-streams/${id}/end`).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/live-streams/${id}`).then((r) => r.data),
};
