import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { movieService } from '@/infrastructure/api/movie-service';
import type { Movie, PaginatedResponse } from '@/domain';

export function useTrendingMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'trending', page],
    queryFn: () => movieService.getTrendingMovies(page),
  });
}

export function useNewReleasesMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'new-releases', page],
    queryFn: () => movieService.getNewReleasesMovies(page),
  });
}

export function useTopRatedMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'top-rated', page],
    queryFn: () => movieService.getTopRatedMovies(page),
  });
}

export function useClassicMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'classics', page],
    queryFn: () => movieService.getClassicMovies(page),
  });
}

export function usePopularMovies(page: number = 1) {
  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ['movies', 'popular', page],
    queryFn: () => movieService.getPopularMovies(page),
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

export function useMovieDetails(id?: number) {
  return useQuery<Movie | null>({
    queryKey: ['movies', 'detail', id],
    queryFn: () => (id ? movieService.getMovieById(id) : null),
    enabled: Boolean(id),
  });
}

export function useHeroFeaturedMovies() {
  return useQuery<Movie[]>({
    queryKey: ['movies', 'hero-featured'],
    queryFn: () => movieService.getHeroFeaturedMovies(),
    staleTime: 10 * 60 * 1000,
  });
}
