import { useMemo } from "react";
import type { Movie } from "@/domain";
import { MovieCarousel } from "./MovieCarousel";
import {
  useTrendingMovies,
  useNewReleasesMovies,
  useTopRatedMovies,
  useClassicMovies,
  usePopularMovies,
} from "@/hooks/use-movies";

interface HomeFeedProps {
  isFadingOut?: boolean;
  onSelectMovie?: (movie: Movie) => void;
}

/**
 * Feed principal da Home com os 5 carrosséis editoriais do Cinera.
 * Aplica deduplicação inteligente em cascata (seenIds) garantindo que
 * nenhum filme se repita entre as diferentes fileiras temáticas.
 */
export function HomeFeed({ isFadingOut = false, onSelectMovie }: HomeFeedProps) {
  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    isError: isErrorTrending,
  } = useTrendingMovies(1);

  const {
    data: newReleasesData,
    isLoading: isLoadingNewReleases,
    isError: isErrorNewReleases,
  } = useNewReleasesMovies(1);

  const {
    data: topRatedData,
    isLoading: isLoadingTopRated,
    isError: isErrorTopRated,
  } = useTopRatedMovies(1);

  const {
    data: classicsData,
    isLoading: isLoadingClassics,
    isError: isErrorClassics,
  } = useClassicMovies(1);

  const {
    data: popularData,
    isLoading: isLoadingPopular,
    isError: isErrorPopular,
  } = usePopularMovies(1);

  // Deduplicação inteligente em cascata: 100% de filmes únicos entre os 5 carrosséis
  const {
    trendingMovies,
    newReleasesMovies,
    topRatedMovies,
    classicMovies,
    popularMovies,
  } = useMemo(() => {
    const seenIds = new Set<number>();

    const dedupe = (list?: Movie[], limit: number = 20) => {
      if (!list) return [];
      const result: Movie[] = [];
      for (const m of list) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          result.push(m);
          if (result.length >= limit) break;
        }
      }
      return result;
    };

    return {
      trendingMovies: dedupe(trendingData?.results),
      newReleasesMovies: dedupe(newReleasesData?.results),
      topRatedMovies: dedupe(topRatedData?.results),
      classicMovies: dedupe(classicsData?.results),
      popularMovies: dedupe(popularData?.results),
    };
  }, [
    trendingData?.results,
    newReleasesData?.results,
    topRatedData?.results,
    classicsData?.results,
    popularData?.results,
  ]);

  return (
    <div
      className={`flex flex-col gap-6 md:gap-7 transition-opacity duration-300 ${
        isFadingOut
          ? "opacity-0 pointer-events-none"
          : "opacity-100 animate-in fade-in duration-500"
      }`}
    >
      {/* 1. Em Alta */}
      <MovieCarousel
        title="Em Alta"
        icon="🔥"
        movies={trendingMovies}
        isLoading={isLoadingTrending}
        isError={isErrorTrending}
        isEager={true}
        onSelectMovie={onSelectMovie}
      />

      {/* 2. Novidades */}
      <MovieCarousel
        title="Novidades"
        icon="✨"
        movies={newReleasesMovies}
        isLoading={isLoadingNewReleases}
        isError={isErrorNewReleases}
        isEager={true}
        onSelectMovie={onSelectMovie}
      />

      {/* 3. Aclamados pela Crítica */}
      <MovieCarousel
        title="Aclamados pela Crítica"
        icon="⭐"
        movies={topRatedMovies}
        isLoading={isLoadingTopRated}
        isError={isErrorTopRated}
        isEager={true}
        onSelectMovie={onSelectMovie}
      />

      {/* 4. Clássicos Indispensáveis */}
      <MovieCarousel
        title="Clássicos Indispensáveis"
        icon="🏆"
        movies={classicMovies}
        isLoading={isLoadingClassics}
        isError={isErrorClassics}
        isEager={true}
        onSelectMovie={onSelectMovie}
      />

      {/* 5. Populares no Brasil */}
      <MovieCarousel
        title="Populares no Brasil"
        icon="🇧🇷"
        movies={popularMovies}
        isLoading={isLoadingPopular}
        isError={isErrorPopular}
        isEager={true}
        onSelectMovie={onSelectMovie}
      />
    </div>
  );
}
