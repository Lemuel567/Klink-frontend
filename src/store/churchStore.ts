import { create } from 'zustand';
import { churchApi } from '../api/church';

interface ChurchSettings {
  id: string;
  churchName: string;
  location?: string;
  denomination?: string;
  churchCode: string;
  welfareAmount?: number;
  contactPhone?: string;
  contactEmail?: string;
  photoUrl?: string;
  deletedAt?: string;
  scheduledDeletionAt?: string;
}

interface ChurchStore {
  settings: ChurchSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (partial: Partial<ChurchSettings>) => void;
  clear: () => void;
}

export const useChurchStore = create<ChurchStore>((set) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const data = await churchApi.getSettings();
      set({ settings: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSettings: (partial) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...partial } : null,
    })),

  clear: () => set({ settings: null }),
}));
