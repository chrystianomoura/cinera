import { create } from "zustand";
import type { Movie } from "@/domain";
import { movieService } from "@/infrastructure/api/movie-service";

interface TrailerState {
  isOpen: boolean;
  movie: Movie | null;
  trailerKey: string | null;
  isLoading: boolean;
  openTrailer: (movie: Movie) => Promise<void>;
  closeTrailer: () => void;
}

// Descarta respostas de buscas antigas quando outro trailer é aberto ou o modal é fechado
let requestId = 0;

/**
 * Estado efêmero do trailer isolado do App: abrir e fechar o trailer não re-renderiza
 * o app inteiro (hero, feed e carrosséis) por baixo da tela de detalhes.
 */
export const useTrailerStore = create<TrailerState>((set) => ({
  isOpen: false,
  movie: null,
  trailerKey: null,
  isLoading: false,

  openTrailer: async (movie) => {
    const currentRequest = ++requestId;
    set({ movie, isOpen: true, isLoading: true, trailerKey: null });
    try {
      const videos = await movieService.getMovieVideos(movie.id);
      if (currentRequest !== requestId) return;

      const trailer =
        videos.find(
          (v) =>
            v.site === "YouTube" &&
            (v.type === "Trailer" || v.type === "Teaser")
        ) ||
        videos.find((v) => v.site === "YouTube") ||
        videos[0];
      set({ trailerKey: trailer?.key || null });
    } catch (err) {
      if (currentRequest !== requestId) return;
      console.error("Erro ao carregar trailer:", err);
      set({ trailerKey: null });
    } finally {
      if (currentRequest === requestId) set({ isLoading: false });
    }
  },

  closeTrailer: () => {
    requestId++;
    set({ isOpen: false });
  },
}));
