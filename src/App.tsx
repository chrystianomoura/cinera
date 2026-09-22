import { useState, useMemo } from "react";
import {
  useTrendingMovies,
  useNewReleasesMovies,
  useTopRatedMovies,
  useClassicMovies,
  usePopularMovies,
  useInfiniteGenreMovies,
  useHeroFeaturedMovies,
} from "@/hooks/use-movies";
import { movieService } from "@/infrastructure/api/movie-service";
import type { Movie } from "@/domain";
import { Header } from "@/features/header/Header";
import { HeroFeatured } from "@/features/hero/HeroFeatured";
import { GenrePills } from "@/features/catalog/GenrePills";
import { MovieCarousel } from "@/features/catalog/MovieCarousel";
import { GenreCatalogGrid } from "@/features/catalog/GenreCatalogGrid";
import { TrailerModal } from "@/features/trailer/TrailerModal";
import { GENRE_NAME_TO_ID } from "@/features/catalog/constants";

export default function App() {
  // Dados do Hero e Carrosséis Temáticos
  const { data: heroMovies, isLoading: isLoadingHero } = useHeroFeaturedMovies();
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

    const trending = dedupe(trendingData?.results);
    const newReleases = dedupe(newReleasesData?.results);
    const topRated = dedupe(topRatedData?.results);
    const classics = dedupe(classicsData?.results);
    const popular = dedupe(popularData?.results);

    return {
      trendingMovies: trending,
      newReleasesMovies: newReleases,
      topRatedMovies: topRated,
      classicMovies: classics,
      popularMovies: popular,
    };
  }, [
    trendingData?.results,
    newReleasesData?.results,
    topRatedData?.results,
    classicsData?.results,
    popularData?.results,
  ]);

  // Controle de Navegação por Gênero
  const [selectedGenre, setSelectedGenre] = useState<string>("Todos");

  const genreId =
    selectedGenre !== "Todos" ? GENRE_NAME_TO_ID[selectedGenre] ?? null : null;

  const {
    data: genreInfiniteData,
    isLoading: isLoadingGenre,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError: isErrorGenre,
  } = useInfiniteGenreMovies(genreId);

  // Derivação dos filmes do gênero paginado
  const genreMovies = useMemo(() => {
    return genreInfiniteData?.pages.flatMap((page) => page.results) ?? [];
  }, [genreInfiniteData]);

  // Modal de Trailer
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  const handleOpenTrailer = async (movie: Movie) => {
    setTrailerMovie(movie);
    setIsTrailerOpen(true);
    setIsLoadingTrailer(true);
    try {
      const videos = await movieService.getMovieVideos(movie.id);
      const trailer =
        videos.find(
          (v) =>
            v.site === "YouTube" &&
            (v.type === "Trailer" || v.type === "Teaser")
        ) ||
        videos.find((v) => v.site === "YouTube") ||
        videos[0];
      setTrailerKey(trailer?.key || null);
    } catch (err) {
      console.error("Erro ao carregar trailer:", err);
      setTrailerKey(null);
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  const handleCloseTrailer = () => {
    setIsTrailerOpen(false);
  };

  const handleSelectGenre = (genre: string) => {
    setSelectedGenre(genre);
    if (genre === "Todos" && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isHomeView = selectedGenre === "Todos";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 pb-20 relative flex flex-col">
      <Header />

      {/* Hero Full-Bleed: Transição aveludada de 700ms com curva natural */}
      <div
        className={`transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden ${
          isHomeView
            ? "max-h-[88vh] opacity-100 scale-100"
            : "max-h-0 opacity-0 scale-[0.98] pointer-events-none"
        }`}
      >
        <HeroFeatured
          candidates={heroMovies || []}
          isLoading={isLoadingHero}
          isTrailerOpen={isTrailerOpen}
          isVisible={isHomeView}
          onOpenTrailer={handleOpenTrailer}
        />
      </div>

      {/* Conteúdo Principal com transição isolada de padding */}
      <main
        className={`relative z-10 px-6 md:px-12 flex flex-col gap-10 transition-[padding-top] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          !isHomeView ? "pt-24 md:pt-28" : "pt-0"
        }`}
      >
        {/* Pílulas de Navegação por Gênero: Sempre visíveis no topo */}
        <GenrePills
          selectedGenre={selectedGenre}
          onSelectGenre={handleSelectGenre}
        />

        {/* MODO 1: Vitrine Principal ("Todos") com os 5 Carrosséis Temáticos a 120 FPS */}
        {isHomeView ? (
          <div className="flex flex-col gap-10 md:gap-14 animate-in fade-in duration-700">
            {/* 1. Em Alta */}
            <MovieCarousel
              title="Em Alta"
              icon="🔥"
              movies={trendingMovies}
              isLoading={isLoadingTrending}
              isError={isErrorTrending}
              isEager={true}
            />

            {/* 2. Novidades */}
            <MovieCarousel
              title="Novidades"
              icon="✨"
              movies={newReleasesMovies}
              isLoading={isLoadingNewReleases}
              isError={isErrorNewReleases}
            />

            {/* 3. Aclamados pela Crítica */}
            <MovieCarousel
              title="Aclamados pela Crítica"
              icon="⭐"
              movies={topRatedMovies}
              isLoading={isLoadingTopRated}
              isError={isErrorTopRated}
            />

            {/* 4. Clássicos Indispensáveis */}
            <MovieCarousel
              title="Clássicos Indispensáveis"
              icon="🏆"
              movies={classicMovies}
              isLoading={isLoadingClassics}
              isError={isErrorClassics}
            />

            {/* 5. Populares no Brasil */}
            <MovieCarousel
              title="Populares no Brasil"
              icon="🇧🇷"
              movies={popularMovies}
              isLoading={isLoadingPopular}
              isError={isErrorPopular}
            />
          </div>
        ) : (
          /* MODO 2: Modo de Exploração por Gênero (Grade Responsiva com Paginação) */
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <GenreCatalogGrid
              genreName={selectedGenre}
              movies={genreMovies}
              isLoading={isLoadingGenre}
              isError={isErrorGenre}
              isLoadingMore={isFetchingNextPage}
              hasMore={Boolean(hasNextPage)}
              onLoadMore={() => fetchNextPage()}
            />
          </div>
        )}
      </main>

      <TrailerModal
        isOpen={isTrailerOpen}
        movie={trailerMovie}
        trailerKey={trailerKey}
        isLoading={isLoadingTrailer}
        onClose={handleCloseTrailer}
      />
    </div>
  );
}
