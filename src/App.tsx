import { useState, useMemo, useRef, useEffect } from "react";
import {
  useInfiniteGenreMovies,
  useHeroFeaturedMovies,
} from "@/hooks/use-movies";
import { movieService } from "@/infrastructure/api/movie-service";
import type { Movie } from "@/domain";
import { Header } from "@/features/header/Header";
import { HeroFeatured } from "@/features/hero/HeroFeatured";
import { GenrePills } from "@/features/catalog/GenrePills";
import { HomeFeed } from "@/features/catalog/HomeFeed";
import { GenreCatalogGrid } from "@/features/catalog/GenreCatalogGrid";
import { MovieDetailsView } from "@/features/movie-details/MovieDetailsView";
import { TrailerModal } from "@/features/trailer/TrailerModal";
import { smoothScrollToTop } from "@/lib/smooth-scroll";

export default function App() {
  const { data: heroMovies, isLoading: isLoadingHero } = useHeroFeaturedMovies();

  const [selectedGenre, setSelectedGenre] = useState<string>("Todos");
  const [pendingGenre, setPendingGenre] = useState<string | null>(null);
  const [activeCatalogView, setActiveCatalogView] = useState<"todos" | "genre">("todos");
  const [lastCategoryGenre, setLastCategoryGenre] = useState<string>("Ação & Aventura");
  const [isFadingOutGenre, setIsFadingOutGenre] = useState(false);
  const [isFadingOutHome, setIsFadingOutHome] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  // Preserva a categoria anterior na memória durante a descida do Hero
  const genreQuery = selectedGenre !== "Todos" ? selectedGenre : lastCategoryGenre;

  const {
    data: genreInfiniteData,
    isLoading: isLoadingGenre,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError: isErrorGenre,
  } = useInfiniteGenreMovies(genreQuery);

  // Derivação dos filmes do gênero paginado com garantia estrita de unicidade
  const genreMovies = useMemo(() => {
    const rawList = genreInfiniteData?.pages.flatMap((page) => page.results) ?? [];
    const seen = new Set<number>();
    return rawList.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
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

  // Estado da tela de detalhes
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleOpenDetails = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDetailsOpen(true);
    // Sincroniza com a URL preservando o histórico de navegação
    const url = new URL(window.location.href);
    url.searchParams.set("filme", String(movie.id));
    window.history.pushState({ movieId: movie.id }, "", url.toString());
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("filme")) {
      url.searchParams.delete("filme");
      const cleanUrl = url.pathname + (url.search ? url.search : "");
      window.history.pushState({}, "", cleanUrl);
    }
  };

  // Sincronização bidirecional do filme ativo com a URL (carregamento inicial e histórico do navegador)
  useEffect(() => {
    const syncMovieFromUrl = () => {
      const url = new URL(window.location.href);
      const filmParam = url.searchParams.get("filme");
      if (!filmParam) {
        setIsDetailsOpen(false);
        return;
      }
      const id = Number(filmParam);
      if (id) {
        movieService.getMovieById(id).then((movie) => {
          if (movie) {
            setSelectedMovie(movie);
            setIsDetailsOpen(true);
          }
        });
      }
    };

    syncMovieFromUrl();
    window.addEventListener("popstate", syncMovieFromUrl);
    return () => window.removeEventListener("popstate", syncMovieFromUrl);
  }, []);

  const handleSelectGenre = (genre: string) => {
    if (genre === selectedGenre) {
      if (window.scrollY > 0) {
        smoothScrollToTop();
      }
      return;
    }

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (genre === "Todos") {
      setPendingGenre(null);
      setIsFadingOutHome(false);
      setSelectedGenre("Todos");
      setIsFadingOutGenre(true);

      if (window.scrollY > 0) {
        smoothScrollToTop();
      }

      // Aguarda a saída da grade de gênero antes de exibir a vitrine principal
      transitionTimerRef.current = window.setTimeout(() => {
        setActiveCatalogView("todos");
        setIsFadingOutGenre(false);
      }, 550);
    } else {
      if (selectedGenre === "Todos") {
        setPendingGenre(genre);
        setIsFadingOutHome(true);

        transitionTimerRef.current = window.setTimeout(() => {
          window.scrollTo(0, 0);
          setSelectedGenre(genre);
          setPendingGenre(null);
          setLastCategoryGenre(genre);
          setActiveCatalogView("genre");
          setIsFadingOutHome(false);
        }, 320);
      } else {
        if (window.scrollY > 0) {
          smoothScrollToTop();
        }
        setPendingGenre(null);
        setIsFadingOutGenre(false);
        setSelectedGenre(genre);
        setLastCategoryGenre(genre);
        setActiveCatalogView("genre");
      }
    }
  };

  const isHomeView = selectedGenre === "Todos";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 pb-20 relative flex flex-col">
      <Header />

      {/* Hero em destaque */}
      <div
        className={`overflow-hidden [overflow-anchor:none] transition-opacity duration-300 ${
          isHomeView && !isFadingOutHome
            ? "max-h-[88vh] opacity-100"
            : isHomeView && isFadingOutHome
            ? "max-h-[88vh] opacity-0"
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <HeroFeatured
          candidates={heroMovies || []}
          isLoading={isLoadingHero}
          isTrailerOpen={isTrailerOpen}
          isVisible={isHomeView && !isFadingOutHome}
          onOpenTrailer={handleOpenTrailer}
          onOpenDetails={handleOpenDetails}
        />
      </div>

      <main
        className={`relative z-10 px-0 md:px-12 flex flex-col gap-3.5 sm:gap-4 md:gap-6 ${
          isHomeView
            ? "pt-0"
            : "pt-[4.25rem] md:pt-[5.25rem]"
        }`}
      >
        <GenrePills
          selectedGenre={pendingGenre ?? selectedGenre}
          onSelectGenre={handleSelectGenre}
        />

        {activeCatalogView === "todos" ? (
          <HomeFeed
            isFadingOut={isFadingOutHome}
            onSelectMovie={handleOpenDetails}
          />
        ) : (
          <div
            className={`transition-opacity duration-300 ${
              isFadingOutGenre
                ? "opacity-0"
                : "opacity-100 animate-in fade-in slide-in-from-bottom-3 duration-500"
            }`}
          >
            <GenreCatalogGrid
              genreName={lastCategoryGenre}
              movies={genreMovies}
              isLoading={isLoadingGenre}
              isError={isErrorGenre}
              isLoadingMore={isFetchingNextPage}
              hasMore={Boolean(hasNextPage)}
              onLoadMore={() => fetchNextPage()}
              onSelectMovie={handleOpenDetails}
            />
          </div>
        )}
      </main>

      <MovieDetailsView
        isOpen={isDetailsOpen}
        movie={selectedMovie}
        onClose={handleCloseDetails}
        onOpenTrailer={handleOpenTrailer}
      />

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
