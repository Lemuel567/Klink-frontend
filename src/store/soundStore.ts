import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';

interface SoundStore {
  musicEnabled: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  initialize: () => Promise<void>;
}

export const useSoundStore = create<SoundStore>((set) => ({
  musicEnabled: true,

  initialize: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEYS.musicEnabled);
      if (stored !== null) {
        set({ musicEnabled: stored === 'true' });
      }
    } catch {
      // ignore — default to enabled
    }
  },

  setMusicEnabled: async (enabled: boolean) => {
    set({ musicEnabled: enabled });
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.musicEnabled, String(enabled));
    } catch {
      // ignore
    }
  },
}));
