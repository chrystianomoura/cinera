import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Movie } from "@/domain";

/** Resumo do filme guardado com a biblioteca: basta para desenhar o card e abrir a ficha sem rede. */
export type LibraryMovie = Pick<
  Movie,
  | "id"
  | "title"
  | "originalTitle"
  | "overview"
  | "posterPath"
  | "backdropPath"
  | "voteAverage"
  | "voteCount"
  | "popularity"
  | "releaseDate"
  | "genres"
  | "categories"
>;

export function toLibraryMovie(movie: Movie): LibraryMovie {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    voteAverage: movie.voteAverage,
    voteCount: movie.voteCount,
    popularity: movie.popularity,
    releaseDate: movie.releaseDate,
    genres: movie.genres,
    categories: movie.categories,
  };
}

interface UserLibraryState {
  watchlist: number[]; // IDs dos filmes marcados como "Quero Assistir"
  watched: number[]; // IDs dos filmes marcados como "Já Assisti"
  movies: Record<number, LibraryMovie>; // Resumo de cada filme salvo, por ID
  toggleWatchlist: (movieId: number, movie?: Movie) => void;
  toggleWatched: (movieId: number, movie?: Movie) => void;
  /** Completa o resumo de filmes salvos antes desta versão (só grava o que ainda falta) */
  rememberMovies: (movies: Movie[]) => void;
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
 * Resumos após um toggle: guarda o filme ao salvar e descarta o resumo quando ele sai das duas listas.
 * `wasSaved` é se o filme já estava na lista do toggle; `inOtherList` se está na outra.
 */
function nextMovies(
  movies: Record<number, LibraryMovie>,
  movieId: number,
  movie: Movie | undefined,
  wasSaved: boolean,
  inOtherList: boolean,
): Record<number, LibraryMovie> {
  if (!wasSaved) {
    return movie ? { ...movies, [movieId]: toLibraryMovie(movie) } : movies;
  }
  if (inOtherList || !(movieId in movies)) return movies;
  const rest = { ...movies };
  delete rest[movieId];
  return rest;
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
      movies: {},

      toggleWatchlist: (movieId: number, movie?: Movie) => {
        if (!isValidMovieId(movieId)) return;

        set((state) => {
          const exists = state.watchlist.includes(movieId);
          return {
            movies: nextMovies(state.movies, movieId, movie, exists, state.watched.includes(movieId)),
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

      toggleWatched: (movieId: number, movie?: Movie) => {
        if (!isValidMovieId(movieId)) return;

        set((state) => {
          const exists = state.watched.includes(movieId);
          return {
            movies: nextMovies(state.movies, movieId, movie, exists, state.watchlist.includes(movieId)),
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

      rememberMovies: (movies: Movie[]) => {
        set((state) => {
          const saved = new Set([...state.watchlist, ...state.watched]);
          const missing = movies.filter((m) => saved.has(m.id) && !state.movies[m.id]);
          if (missing.length === 0) return state;
          return {
            movies: { ...state.movies, ...Object.fromEntries(missing.map((m) => [m.id, toLibraryMovie(m)])) },
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
      version: 2,
      // Persiste as listas de IDs e o resumo dos filmes salvos, isolando ações e funções
      partialize: (state) => {
        const watchlist = state.watchlist.filter(isValidMovieId);
        const watched = state.watched.filter(isValidMovieId);
        const saved = new Set([...watchlist, ...watched]);
        return {
          watchlist,
          watched,
          movies: Object.fromEntries(Object.entries(state.movies).filter(([id]) => saved.has(Number(id)))),
        };
      },
      // Migração segura para compatibilidade retroativa
      migrate: (persistedState: unknown) => {
        if (
          persistedState &&
          typeof persistedState === "object" &&
          "watchlist" in persistedState &&
          "watched" in persistedState
        ) {
          const raw = persistedState as { watchlist?: unknown[]; watched?: unknown[]; movies?: unknown };
          return {
            movies:
              raw.movies && typeof raw.movies === "object" && !Array.isArray(raw.movies)
                ? (raw.movies as Record<number, LibraryMovie>)
                : {},
            watchlist: Array.isArray(raw.watchlist)
              ? raw.watchlist.filter(isValidMovieId)
              : [],
            watched: Array.isArray(raw.watched)
              ? raw.watched.filter(isValidMovieId)
              : [],
          };
        }
        return { watchlist: [], watched: [], movies: {} };
      },
    }
  )
);
