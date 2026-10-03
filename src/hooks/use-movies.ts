import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { movieService } from '@/infrastructure/api/movie-service';
import type { Movie, PaginatedResponse } from '@/domain';

export function useTrendingMovies(page: number = 1, enabled: boolean = true) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'trending', page],
    queryFn: () => movieService.getTrendingMovies(page),
    enabled,
  });
}

export function useNewReleasesMovies(page: number = 1, enabled: boolean = true) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'new-releases', page],
    queryFn: () => movieService.getNewReleasesMovies(page),
    enabled,
  });
}

export function useTopRatedMovies(page: number = 1, enabled: boolean = true) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'top-rated', page],
    queryFn: () => movieService.getTopRatedMovies(page),
    enabled,
  });
}

export function useClassicMovies(page: number = 1, enabled: boolean = true) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'classics', page],
    queryFn: () => movieService.getClassicMovies(page),
    enabled,
  });
}

export function usePopularMovies(page: number = 1, enabled: boolean = true) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'popular', page],
    queryFn: () => movieService.getPopularMovies(page),
    enabled,
  });
}

export function useInfiniteGenreMovies(genreQuery: string | number | null) {
  return useInfiniteQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'genre-infinite', genreQuery],
    queryFn: ({ pageParam = 1 }) =>
      genreQuery
        ? movieService.getMoviesByGenre(genreQuery, pageParam as number)
        : Promise.resolve({ page: 1, results: [], totalPages: 1, totalResults: 0 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: Boolean(genreQuery),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 2,
  });
}

export function useHeroFeaturedMovies(enabled: boolean = true) {
  return useQuery<Movie[]>({
    queryKey: ['movies', 'hero-featured'],
    queryFn: () => movieService.getHeroFeaturedMovies(),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}
