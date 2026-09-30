import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserLibraryState {
  watchlist: number[]; // IDs dos filmes marcados como "Quero Assistir"
  watched: number[]; // IDs dos filmes marcados como "Já Assisti"
  toggleWatchlist: (movieId: number) => void;
  toggleWatched: (movieId: number) => void;
  moveToWatched: (movieId: number) => void;
  moveToWatchlist: (movieId: number) => void;
}

/**
 * Validador defensivo de integridade de ID de filme
 */
function isValidMovieId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/**
 * Store global persistente (localStorage) para a biblioteca pessoal do usuário:
 * - "Quero Assistir" (Watchlist)
 * - "Já Assisti" (Watched History)
 */
export const useUserLibrary = create<UserLibraryState>()(
  persist(
    (set) => ({
      watchlist: [],
      watched: [],

      toggleWatchlist: (movieId: number) => {
        if (!isValidMovieId(movieId)) return;

        set((state) => {
          const exists = state.watchlist.includes(movieId);
          return {
            // Recém-adicionado sempre no topo com desduplicação garantida (LIFO)
            watchlist: exists
              ? state.watchlist.filter((id) => id !== movieId)
              : [movieId, ...state.watchlist.filter((id) => id !== movieId)],
            // Se marcou para assistir, remove do histórico de assistidos automaticamente
            watched: !exists
              ? state.watched.filter((id) => id !== movieId)
              : state.watched,
          };
        });
      },

      toggleWatched: (movieId: number) => {
        if (!isValidMovieId(movieId)) return;

        set((state) => {
          const exists = state.watched.includes(movieId);
          return {
            // Recém-assistido sempre no topo com desduplicação garantida (LIFO)
            watched: exists
              ? state.watched.filter((id) => id !== movieId)
              : [movieId, ...state.watched.filter((id) => id !== movieId)],
            // Se marcou como assistido, remove da fila de espera automaticamente
            watchlist: !exists
              ? state.watchlist.filter((id) => id !== movieId)
              : state.watchlist,
          };
        });
      },

      moveToWatched: (movieId: number) => {
        if (!isValidMovieId(movieId)) return;

        set((state) => ({
          watchlist: state.watchlist.filter((id) => id !== movieId),
          watched: state.watched.includes(movieId)
            ? state.watched
            : [movieId, ...state.watched.filter((id) => id !== movieId)],
        }));
      },

      moveToWatchlist: (movieId: number) => {
        if (!isValidMovieId(movieId)) return;

        set((state) => ({
          watched: state.watched.filter((id) => id !== movieId),
          watchlist: state.watchlist.includes(movieId)
            ? state.watchlist
            : [movieId, ...state.watchlist.filter((id) => id !== movieId)],
        }));
      },
    }),
    {
      name: "cinera_user_library",
      version: 1,
      // Persiste exclusivamente as listas de IDs, isolando ações e funções
      partialize: (state) => ({
        watchlist: state.watchlist.filter(isValidMovieId),
        watched: state.watched.filter(isValidMovieId),
      }),
      // Migração segura para compatibilidade retroativa
      migrate: (persistedState: unknown) => {
        if (
          persistedState &&
          typeof persistedState === "object" &&
          "watchlist" in persistedState &&
          "watched" in persistedState
        ) {
          const raw = persistedState as { watchlist?: unknown[]; watched?: unknown[] };
          return {
            watchlist: Array.isArray(raw.watchlist)
              ? raw.watchlist.filter(isValidMovieId)
              : [],
            watched: Array.isArray(raw.watched)
              ? raw.watched.filter(isValidMovieId)
              : [],
          };
        }
        return { watchlist: [], watched: [] };
      },
    }
  )
);
