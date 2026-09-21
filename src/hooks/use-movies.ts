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

/**
 * Hook customizado para buscar os detalhes completos de um filme pelo seu ID.
 */
export function useMovieDetails(id?: number) {
  return useQuery<Movie | null>({
    queryKey: ['movies', 'detail', id],
    queryFn: () => (id ? movieService.getMovieById(id) : null),
    enabled: Boolean(id),
  });
}

/**
 * Hook customizado para buscar os filmes de destaque selecionados para o Hero.
 * Inclui validação estrita de tagline, backdrop e nota.
 */
export function useHeroFeaturedMovies() {
  return useQuery<Movie[]>({
    queryKey: ['movies', 'hero-featured'],
    queryFn: () => movieService.getHeroFeaturedMovies(),
    staleTime: 10 * 60 * 1000, // 10 minutos de cache
  });
}
