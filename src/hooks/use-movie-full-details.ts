import { useQuery } from "@tanstack/react-query";
import { movieService } from "@/infrastructure/api/movie-service";
import { OmdbService, type ImdbRatingData } from "@/infrastructure/api/omdb-service";
import type { Movie, MovieCredits, MovieWatchProviders } from "@/domain";
import type { MovieVideo } from "@/infrastructure/api/movie-service";

/**
 * Hook composto para carregar a ficha completa do filme em paralelo com cache.
 */
export function useMovieFullDetails(movieId: number | null) {
  const isEnabled = Boolean(movieId && movieId > 0);

  const movieQuery = useQuery<Movie | null>({
    queryKey: ["movie", "detail", movieId],
    queryFn: () => (movieId ? movieService.getMovieById(movieId) : null),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60, // 1 hora
  });

  const imdbId = movieQuery.data?.imdbId;

  // Busca nota do IMDb somente sob demanda na tela de detalhes
  const imdbRatingQuery = useQuery<ImdbRatingData | null>({
    queryKey: ["movie", "imdbRating", imdbId],
    queryFn: () => OmdbService.getImdbRating(imdbId),
    enabled: Boolean(imdbId && imdbId.trim().length > 0),
    staleTime: 1000 * 60 * 60 * 24, // 24 horas em cache
  });

  const creditsQuery = useQuery<MovieCredits | null>({
    queryKey: ["movie", "credits", movieId],
    queryFn: () => (movieId ? movieService.getMovieCredits(movieId) : null),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60,
  });

  const providersQuery = useQuery<MovieWatchProviders | null>({
    queryKey: ["movie", "providers", movieId],
    queryFn: () => (movieId ? movieService.getMovieWatchProviders(movieId) : null),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60 * 6, // 6 horas
  });

  const certificationQuery = useQuery<string | null>({
    queryKey: ["movie", "certification", movieId],
    queryFn: () => (movieId ? movieService.getMovieReleaseDates(movieId) : null),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  });

  const galleryQuery = useQuery<string[]>({
    queryKey: ["movie", "gallery", movieId],
    queryFn: () => (movieId ? movieService.getMovieGalleryImages(movieId) : []),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const videosQuery = useQuery<MovieVideo[]>({
    queryKey: ["movie", "videos", movieId],
    queryFn: () => (movieId ? movieService.getMovieVideos(movieId) : []),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const trailerVideo =
    videosQuery.data?.find(
      (v) =>
        v.site === "YouTube" &&
        (v.type === "Trailer" || v.type === "Teaser")
    ) ||
    videosQuery.data?.find((v) => v.site === "YouTube") ||
    videosQuery.data?.[0];

  return {
    movie: movieQuery.data,
    isLoadingMovie: movieQuery.isLoading,
    isErrorMovie: movieQuery.isError,

    credits: creditsQuery.data,
    isLoadingCredits: creditsQuery.isLoading,

    providers: providersQuery.data,
    isLoadingProviders: providersQuery.isLoading,

    certification: certificationQuery.data,

    imdbRating: imdbRatingQuery.data ?? null,
    isLoadingImdbRating: imdbRatingQuery.isLoading,

    gallery: galleryQuery.data ?? [],
    isLoadingGallery: galleryQuery.isLoading,

    trailerKey: trailerVideo?.key ?? null,
    isLoadingTrailer: videosQuery.isLoading,
  };
}
