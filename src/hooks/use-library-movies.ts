import { useQueries } from "@tanstack/react-query";
import { movieService } from "@/infrastructure/api/movie-service";
import type { Movie } from "@/domain";

/**
 * Hook para carregar filmes salvos na biblioteca (por lista de IDs).
 * Executa requisições cacheadas e com paralelismo seguro no TanStack Query.
 */
export function useLibraryMovies(movieIds: number[], enabled: boolean = true) {
  const queries = useQueries({
    queries: movieIds.map((id) => ({
      queryKey: ["movie-details", id],
      queryFn: () => movieService.getMovieById(id),
      staleTime: 1000 * 60 * 30, // 30 minutos de cache
      gcTime: 1000 * 60 * 60,    // 1 hora de retenção
      enabled,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  // Filtra apenas os filmes válidos que retornaram com sucesso
  const movies: Movie[] = queries
    .map((q) => q.data)
    .filter((m): m is Movie => m !== null && m !== undefined);

  return {
    movies,
    isLoading,
    isFetching,
  };
}
