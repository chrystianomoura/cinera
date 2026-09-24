import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserLibraryState {
  watchlist: number[]; // IDs dos filmes marcados como "Quero Assistir"
  watched: number[]; // IDs dos filmes marcados como "Já Assisti"
  toggleWatchlist: (movieId: number) => void;
  toggleWatched: (movieId: number) => void;
  isWatchlist: (movieId: number) => boolean;
  isWatched: (movieId: number) => boolean;
}

/**
 * Store global persistente (localStorage) para a biblioteca pessoal do usuário:
 * - "Quero Assistir" (Watchlist)
 * - "Já Assisti" (Watched History)
 */
export const useUserLibrary = create<UserLibraryState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      watched: [],

      toggleWatchlist: (movieId: number) => {
        set((state) => {
          const exists = state.watchlist.includes(movieId);
          return {
            watchlist: exists
              ? state.watchlist.filter((id) => id !== movieId)
              : [...state.watchlist, movieId],
          };
        });
      },

      toggleWatched: (movieId: number) => {
        set((state) => {
          const exists = state.watched.includes(movieId);
          return {
            watched: exists
              ? state.watched.filter((id) => id !== movieId)
              : [...state.watched, movieId],
          };
        });
      },

      isWatchlist: (movieId: number) => {
        return get().watchlist.includes(movieId);
      },

      isWatched: (movieId: number) => {
        return get().watched.includes(movieId);
      },
    }),
    {
      name: "cinera_user_library",
    }
  )
);
