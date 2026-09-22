import { useState } from "react";
import { useTrendingMovies, useHeroFeaturedMovies } from "@/hooks/use-movies";
import { movieService } from "@/infrastructure/api/movie-service";
import type { Movie } from "@/domain";
import { Header } from "@/features/header/Header";
import { HeroFeatured } from "@/features/hero/HeroFeatured";
import { GenrePills } from "@/features/catalog/GenrePills";
import { TrendingCarousel } from "@/features/catalog/TrendingCarousel";
import { TrailerModal } from "@/features/trailer/TrailerModal";

export default function App() {
  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    isError: isErrorTrending,
  } = useTrendingMovies(1);
  const { data: heroMovies, isLoading: isLoadingHero } =
    useHeroFeaturedMovies();

  const [selectedGenre, setSelectedGenre] = useState<string>("Todos");
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
            (v.type === "Trailer" || v.type === "Teaser"),
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

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 pb-20 relative flex flex-col">
      <Header />

      <HeroFeatured
        candidates={heroMovies || []}
        isLoading={isLoadingHero}
        isTrailerOpen={isTrailerOpen}
        onOpenTrailer={handleOpenTrailer}
      />

      <main className="relative z-10 px-6 md:px-12 flex flex-col gap-10">
        <GenrePills
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
        />

        <TrendingCarousel
          movies={trendingData?.results}
          isLoading={isLoadingTrending}
          isError={isErrorTrending}
        />
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
