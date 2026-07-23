import { apiClient } from './client';

export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

export const assistantApi = {
  /**
   * "Ask Klink" — sends the question plus the last few turns for context.
   * Nothing is stored server-side; the conversation lives on the device.
   */
  ask: (question: string, history: AssistantTurn[]) =>
    apiClient
      .post<{ answer: string }>('/assistant/ask', {
        question,
        // Cap history client-side too (backend rejects > 8 turns)
        history: history.slice(-6).map((t) => ({ role: t.role, text: t.text.slice(0, 1500) })),
      })
      .then((r) => r.data.answer),

  /**
   * Polish/expand rough text for any compose field. `contentType` tells the AI
   * what the text is (e.g. "an event description") so it matches the tone.
   * Returns the improved text — the caller reviews it before saving.
   */
  polish: (text: string, contentType: string) =>
    apiClient
      .post<{ polished: string }>('/assistant/polish', { text, contentType })
      .then((r) => r.data.polished),
};
