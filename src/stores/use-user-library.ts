import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserLibraryState {
  watchlist: number[]; // IDs dos filmes marcados como "Quero Assistir"
  watched: number[]; // IDs dos filmes marcados como "Já Assisti"
  toggleWatchlist: (movieId: number) => void;
  toggleWatched: (movieId: number) => void;
  moveToWatched: (movieId: number) => void;
  moveToWatchlist: (movieId: number) => void;
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
            // Recém-adicionado sempre no topo (LIFO)
            watchlist: exists
              ? state.watchlist.filter((id) => id !== movieId)
              : [movieId, ...state.watchlist],
            // Se marcou para assistir, remove do histórico de assistidos automaticamente
            watched: !exists
              ? state.watched.filter((id) => id !== movieId)
              : state.watched,
          };
        });
      },

      toggleWatched: (movieId: number) => {
        set((state) => {
          const exists = state.watched.includes(movieId);
          return {
            // Recém-assistido sempre no topo (LIFO)
            watched: exists
              ? state.watched.filter((id) => id !== movieId)
              : [movieId, ...state.watched],
            // Se marcou como assistido, remove da fila de espera automaticamente
            watchlist: !exists
              ? state.watchlist.filter((id) => id !== movieId)
              : state.watchlist,
          };
        });
      },

      moveToWatched: (movieId: number) => {
        set((state) => ({
          watchlist: state.watchlist.filter((id) => id !== movieId),
          watched: state.watched.includes(movieId)
            ? state.watched
            : [movieId, ...state.watched],
        }));
      },

      moveToWatchlist: (movieId: number) => {
        set((state) => ({
          watched: state.watched.filter((id) => id !== movieId),
          watchlist: state.watchlist.includes(movieId)
            ? state.watchlist
            : [movieId, ...state.watchlist],
        }));
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
