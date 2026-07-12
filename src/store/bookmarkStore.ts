import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local-only sermon bookmarks (no backend endpoint yet).
// Stored per device in AsyncStorage; survives app restarts.
interface BookmarkStore {
  sermonIds: string[];
  isBookmarked: (id: string) => boolean;
  toggle: (id: string) => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      sermonIds: [],

      isBookmarked: (id) => get().sermonIds.includes(id),

      toggle: (id) =>
        set((state) => ({
          sermonIds: state.sermonIds.includes(id)
            ? state.sermonIds.filter((s) => s !== id)
            : [id, ...state.sermonIds],
        })),
    }),
    {
      name: 'klink_sermon_bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
