import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
 * Hook customizado para buscar as novidades e lançamentos autênticos do ano.
 */
export function useNewReleasesMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'new-releases', page],
    queryFn: () => movieService.getNewReleasesMovies(page),
  });
}

/**
 * Hook legado mantido para retrocompatibilidade.
 */
export function useNowPlayingMovies(page: number = 1) {
  return useNewReleasesMovies(page);
}

/**
 * Hook customizado para buscar filmes aclamados pela crítica (mais bem avaliados).
 */
export function useTopRatedMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'top-rated', page],
    queryFn: () => movieService.getTopRatedMovies(page),
  });
}

/**
 * Hook customizado para buscar clássicos indispensáveis do cinema (pré-2000).
 */
export function useClassicMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'classics', page],
    queryFn: () => movieService.getClassicMovies(page),
  });
}

/**
 * Hook customizado para buscar filmes populares.
 */
export function usePopularMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'popular', page],
    queryFn: () => movieService.getPopularMovies(page),
  });
}

/**
 * Hook customizado com paginação infinita para o catálogo de gênero.
 */
export function useInfiniteGenreMovies(genreId: number | null) {
  return useInfiniteQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'genre-infinite', genreId],
    queryFn: ({ pageParam = 1 }) =>
      genreId
        ? movieService.getMoviesByGenre(genreId, pageParam as number)
        : Promise.resolve({ page: 1, results: [], totalPages: 1, totalResults: 0 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: Boolean(genreId),
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
