import { useQuery } from '@tanstack/react-query';
import { movieService } from '@/infrastructure/api/movie-service';
import type { Movie, PaginatedResponse } from '@/domain';

/**
 * Hook customizado para buscar a lista de filmes em tendência.
 * 
 * @param page A página atual para paginação dos resultados (padrão: 1)
 */
export function useTrendingMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'trending', page],
    queryFn: () => movieService.getTrendingMovies(page),
  });
}
