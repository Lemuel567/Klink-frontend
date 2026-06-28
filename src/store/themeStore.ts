import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';

type ColorScheme = 'light' | 'dark' | 'system';

interface ThemeStore {
  preference: ColorScheme;
  setPreference: (scheme: ColorScheme) => void;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  preference: 'system',

  initialize: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEYS.colorScheme);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ preference: stored });
      }
    } catch {
      // ignore — fall back to system
    }
  },

  setPreference: async (scheme: ColorScheme) => {
    set({ preference: scheme });
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.colorScheme, scheme);
    } catch {
      // ignore
    }
  },
}));
