import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';
import { soundManager } from '../utils/soundManager';

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
        const enabled = stored === 'true';
        set({ musicEnabled: enabled });
        soundManager.setMusicEnabled(enabled);
      }
    } catch {
      // ignore — default to enabled
    }
  },

  setMusicEnabled: async (enabled: boolean) => {
    set({ musicEnabled: enabled });
    soundManager.setMusicEnabled(enabled);
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.musicEnabled, String(enabled));
    } catch {
      // ignore
    }
  },
}));
