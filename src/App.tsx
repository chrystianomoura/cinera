import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  useInfiniteGenreMovies,
  useHeroFeaturedMovies,
} from "@/hooks/use-movies";
import { movieService } from "@/infrastructure/api/movie-service";
import { useCatalog } from "@/hooks/use-catalog";
import { useTrailerStore } from "@/features/trailer/use-trailer-store";
import type { Movie } from "@/domain";
import { Header } from "@/features/header/Header";
import { HeroFeatured } from "@/features/hero/HeroFeatured";
import { GenrePills } from "@/features/catalog/GenrePills";
import { HomeFeed } from "@/features/catalog/HomeFeed";
import { GenreCatalogGrid } from "@/features/catalog/GenreCatalogGrid";
import { MovieDetailsView } from "@/features/movie-details/MovieDetailsView";
import { TrailerModal } from "@/features/trailer/TrailerModal";
import { SearchModal } from "@/features/search/SearchModal";
import { UserLibraryView } from "@/features/library/UserLibraryView";
import { useSearchStore } from "@/features/search/use-search-store";
import { openSearchAndFocus } from "@/features/search/open-search";
import { smoothScrollToTop } from "@/lib/smooth-scroll";

export default function App() {
  // Referência estável: o App não assina o estado do trailer
  const openTrailer = useTrailerStore.getState().openTrailer;

  // Destaque: do catálogo curado quando existir; senão, da busca ao vivo
  const { data: catalog, isLoading: isLoadingCatalog } = useCatalog();
  const catalogHero = catalog?.hero?.length ? catalog.hero : null;
  const { data: liveHero, isLoading: isLoadingLiveHero } = useHeroFeaturedMovies(
    !isLoadingCatalog && !catalogHero,
  );
  const heroMovies = catalogHero ?? liveHero;
  const isLoadingHero = isLoadingCatalog || (!catalogHero && isLoadingLiveHero);
  // Os filmes do destaque não se repetem nas fileiras
  const heroIds = useMemo(() => (heroMovies ?? []).map((movie) => movie.id), [heroMovies]);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

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

  // Estado da tela de detalhes
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFromLibrary, setIsFromLibrary] = useState(false);

  const handleOpenDetails = useCallback((movie: Movie, fromLibrary: boolean = false) => {
    setSelectedMovie(movie);
    setIsDetailsOpen(true);
    setIsFromLibrary(fromLibrary);
    // Sincroniza com a URL preservando o histórico de navegação
    const url = new URL(window.location.href);
    url.searchParams.set("filme", String(movie.id));
    window.history.pushState({ movieId: movie.id }, "", url.toString());
  }, []);

  const isFromSearch = useSearchStore((state) => state.isPausedForDetails);

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setIsFromLibrary(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("filme")) {
      url.searchParams.delete("filme");
      const cleanUrl = url.pathname + (url.search ? url.search : "");
      window.history.pushState({}, "", cleanUrl);
    }
    const { isPausedForDetails, resumeSearchFromDetails } = useSearchStore.getState();
    if (isPausedForDetails) {
      resumeSearchFromDetails();
    }
  };

  // Sincronização bidirecional do filme ativo com a URL (carregamento inicial e histórico do navegador)
  useEffect(() => {
    let cancelled = false;

    const syncMovieFromUrl = () => {
      const url = new URL(window.location.href);
      const filmParam = url.searchParams.get("filme");
      if (!filmParam) {
        setIsDetailsOpen(false);
        const { isPausedForDetails, resumeSearchFromDetails } = useSearchStore.getState();
        if (isPausedForDetails) {
          resumeSearchFromDetails();
        }
        return;
      }
      const id = Number(filmParam);
      if (id) {
        const currentId = id;
        movieService
          .getMovieById(id)
          .then((movie) => {
            if (cancelled) return;
            // Ignora resposta desatualizada se a URL mudou enquanto o fetch estava em trânsito
            const currentParam = new URL(window.location.href).searchParams.get("filme");
            if (Number(currentParam) !== currentId) return;

            if (movie) {
              setSelectedMovie(movie);
              setIsDetailsOpen(true);
            }
          })
          // Com a API fora do ar o link direto não abre a ficha e a Home continua normal
          .catch(() => undefined);
      }
    };

    syncMovieFromUrl();
    window.addEventListener("popstate", syncMovieFromUrl);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", syncMovieFromUrl);
    };
  }, []);

  // Limpeza de timers pendentes ao desmontar o componente
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Atalho global de teclado: Cmd + K (Mac) e Ctrl + K (Windows) para abrir a busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const store = useSearchStore.getState();
        if (store.isOpen) {
          store.closeSearch();
        } else {
          openSearchAndFocus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
          window.scrollTo({ top: 0, behavior: "instant" });
          setSelectedGenre(genre);
          setLastCategoryGenre(genre);
          setPendingGenre(null);
          setActiveCatalogView("genre");
          setIsFadingOutHome(false);
        }, 180);
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
        setPendingGenre(null);
        setIsFadingOutGenre(false);
        setSelectedGenre(genre);
        setLastCategoryGenre(genre);
        setActiveCatalogView("genre");
      }
    }
  };

  // Logo: apenas sobe ao topo de onde está, sem trocar de tela
  const handleLogoClick = () => {
    if (window.scrollY > 0) {
      smoothScrollToTop();
    }
  };

  const isHomeView = selectedGenre === "Todos";
  const isSearchOpen = useSearchStore((state) => state.isOpen);
  const isSearchPaused = useSearchStore((state) => state.isPausedForDetails);
  const isAnyOverlayActive = isDetailsOpen || isLibraryOpen || isSearchOpen || isSearchPaused;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 pb-page-end relative flex flex-col">
      <Header
        onSearchClick={openSearchAndFocus}
        onLibraryClick={() => setIsLibraryOpen(true)}
        onLogoClick={handleLogoClick}
      />

      {/* Hero em destaque com isolamento estrito de camada para não interferir nos carrosséis */}
      <div
        className={`overflow-hidden [overflow-anchor:none] transition-opacity duration-300 [contain:paint_layout] [isolation:isolate] ${
          isHomeView && !isFadingOutHome
            ? "max-h-[850px] opacity-100"
            : isHomeView && isFadingOutHome
            ? "max-h-[850px] opacity-0"
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <HeroFeatured
          candidates={heroMovies || []}
          isLoading={isLoadingHero}
          isPaused={isAnyOverlayActive}
          isVisible={isHomeView && !isFadingOutHome}
          onOpenTrailer={openTrailer}
          onOpenDetails={handleOpenDetails}
        />
      </div>

      <main
        className={`relative z-10 px-0 md:px-12 flex flex-col gap-2.5 sm:gap-3.5 md:gap-6 ${
          isHomeView
            ? "pt-0"
            : "pt-2 sm:pt-3 md:pt-4"
        }`}
      >
        <GenrePills
          selectedGenre={pendingGenre ?? selectedGenre}
          onSelectGenre={handleSelectGenre}
        />

        {activeCatalogView === "todos" ? (
          <HomeFeed
            excludeIds={heroIds}
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
        onOpenTrailer={openTrailer}
        isFromSearch={isFromSearch}
        isFromLibrary={isFromLibrary}
      />

      <TrailerModal />

      {/* Modal de Pesquisa Global (Command Palette) */}
      <SearchModal
        onSelectMovie={handleOpenDetails}
        onSelectGenre={handleSelectGenre}
      />

      {/* Tela de Minha Biblioteca (Quero Assistir / Já Assisti) */}
      <UserLibraryView
        isOpen={isLibraryOpen && !isDetailsOpen}
        isLibraryActive={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectMovie={(movie) => handleOpenDetails(movie, true)}
      />
    </div>
  );
}
