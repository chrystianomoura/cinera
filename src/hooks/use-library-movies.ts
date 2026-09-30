import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { movieService } from "@/infrastructure/api/movie-service";
import type { Movie } from "@/domain";

/**
 * Hook para carregar filmes salvos na biblioteca (por lista de IDs).
 * Executa requisições cacheadas e com paralelismo seguro no TanStack Query v5.
 */
export function useLibraryMovies(movieIds: number[], enabled: boolean = true) {
  // Garante unicidade estrita de IDs e estabilidade referencial
  const uniqueIds = useMemo(() => Array.from(new Set(movieIds)), [movieIds]);

  return useQueries({
    // Quando desabilitado (ex: modal fechado), não cria observers em memória
    queries: enabled
      ? uniqueIds.map((id) => ({
          queryKey: ["movie-details", id],
          queryFn: () => movieService.getMovieById(id),
          staleTime: 1000 * 60 * 30, // 30 minutos de cache
          gcTime: 1000 * 60 * 60,    // 1 hora de retenção
        }))
      : [],
    // Memoização estrutural nativa do TanStack Query v5 evitando re-renders supérfluos
    combine: (results) => {
      const movies = results
        .map((r) => r.data)
        .filter((m): m is Movie => m !== null && m !== undefined);

      return {
        movies,
        isLoading: results.some((r) => r.isLoading),
        isFetching: results.some((r) => r.isFetching),
        isError: results.some((r) => r.isError),
        isSuccess: results.length > 0 && results.every((r) => r.isSuccess),
      };
    },
  });
}
