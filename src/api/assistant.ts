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

  // Translate church content (sermon/devotional) into a local language.
  translate: (text: string, targetLanguage: string) =>
    apiClient
      .post<{ translated: string }>('/assistant/translate', { text, targetLanguage })
      .then((r) => r.data.translated),

  // Small-group discussion guide from a sermon's notes.
  discussionGuide: (params: {
    title: string;
    scripture?: string;
    memoryVerse?: string;
    notes: string;
  }) =>
    apiClient
      .post<{ guide: string }>('/assistant/discussion-guide', params)
      .then((r) => r.data.guide),
};

// Languages offered for content translation (Ghana-focused).
export const TRANSLATE_LANGUAGES = ['Twi', 'Ga', 'Ewe', 'French', 'English'] as const;

export const bibleApi = {
  // A thorough explanation of the day's verse.
  reflection: (reference: string, verse: string) =>
    apiClient
      .post<{ reflection: string }>('/assistant/bible-reflection', { reference, verse })
      .then((r) => r.data.reflection),

  // Discuss the day's verse with the AI companion.
  chat: (reference: string, verse: string, question: string, history: AssistantTurn[]) =>
    apiClient
      .post<{ answer: string }>('/assistant/bible-chat', {
        reference,
        verse,
        question,
        history: history.slice(-6).map((t) => ({ role: t.role, text: t.text.slice(0, 1500) })),
      })
      .then((r) => r.data.answer),
};
