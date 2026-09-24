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
  // Dados do Hero em Destaque
  const { data: heroMovies, isLoading: isLoadingHero } = useHeroFeaturedMovies();

  // Controle de Navegação por Gênero
  const [selectedGenre, setSelectedGenre] = useState<string>("Todos");
  const [pendingGenre, setPendingGenre] = useState<string | null>(null);
  // Controle coreografado dos cards: o Hero desce PRIMEIRO, e os carrosséis entram depois
  const [activeCatalogView, setActiveCatalogView] = useState<"todos" | "genre">("todos");
  const [lastCategoryGenre, setLastCategoryGenre] = useState<string>("Ação & Aventura");
  const [isFadingOutGenre, setIsFadingOutGenre] = useState(false);
  const [isFadingOutHome, setIsFadingOutHome] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  // Mantém a categoria anterior viva na memória durante a descida do Hero
  const categoryToQuery = selectedGenre !== "Todos" ? selectedGenre : lastCategoryGenre;
  const genreQuery = categoryToQuery;

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

  // Tela de Detalhes Completa com Atmosfera Estilo Spotify
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
    // Remove o parâmetro da URL de forma limpa sem recarregar a página
    const url = new URL(window.location.href);
    if (url.searchParams.has("filme")) {
      url.searchParams.delete("filme");
      const cleanUrl = url.pathname + (url.search ? url.search : "");
      window.history.pushState({}, "", cleanUrl);
    }
  };

  // Suporte à navegação do histórico (botão Voltar do navegador ou mouse)
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const filmParam = url.searchParams.get("filme");
      if (!filmParam) {
        setIsDetailsOpen(false);
      } else {
        const id = Number(filmParam);
        if (id) {
          movieService.getMovieById(id).then((m) => {
            if (m) {
              setSelectedMovie(m);
              setIsDetailsOpen(true);
            }
          });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Leitura inicial de filme na URL caso a página seja aberta diretamente com ?filme=ID
  useEffect(() => {
    const url = new URL(window.location.href);
    const filmParam = url.searchParams.get("filme");
    if (filmParam) {
      const id = Number(filmParam);
      if (id) {
        movieService.getMovieById(id).then((m) => {
          if (m) {
            setSelectedMovie(m);
            setIsDetailsOpen(true);
          }
        });
      }
    }
  }, []);

  const handleSelectGenre = (genre: string) => {
    // 1. Se clicou no gênero que já está ativo (ex: já está em "Todos" e clicou em "Todos" para voltar ao topo):
    // Desliza com suavidade e velocidade natural, SEM engasgos e sem disparar recálculos de hover!
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

      // 1. O Hero começa a descer IMEDIATAMENTE (isHomeView = true)
      setSelectedGenre("Todos");

      // 2. Dissolve suavemente a grade da categoria em 300ms (evita ver a troca de cards)
      setIsFadingOutGenre(true);

      // 3. Se a tela estiver rolada, sobe suavemente e sem solavancos
      if (window.scrollY > 0) {
        smoothScrollToTop();
      }

      // 4. CIRÚRGICO: Aos 550ms (com a grade anterior já dissolvida e o Hero cobrindo a tela),
      // alternamos para os carrosséis da Home com fade-in macio.
      transitionTimerRef.current = window.setTimeout(() => {
        setActiveCatalogView("todos");
        setIsFadingOutGenre(false);
      }, 550);
    } else {
      // Indo de Todos (ou de outro gênero) para uma categoria:
      if (selectedGenre === "Todos") {
        // Ao clicar numa categoria, a foto NÃO percorre a tela e NÃO fecha como sanfona.
        // Ela simplesmente dissolve suavemente no lugar (fade-out puro de 300ms, sem piscar e sem se mexer).
        // Quando apaga no preto, montamos a categoria já perfeitamente assentada no topo.
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
        // Já estava em outra categoria (Hero já fechado): rolagem suave até o topo da nova categoria
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

      {/* Hero Full-Bleed: Dissolve suave no lugar sem percorrer nem piscar */}
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

      {/* Conteúdo Principal com transição harmonizada de padding */}
      <main
        className={`relative z-10 px-6 md:px-12 flex flex-col gap-5 md:gap-6 ${
          isHomeView
            ? "pt-0"
            : "pt-[4.25rem] md:pt-[5.25rem]"
        }`}
      >
        {/* Pílulas de Navegação por Gênero: Sempre visíveis no topo */}
        <GenrePills
          selectedGenre={pendingGenre ?? selectedGenre}
          onSelectGenre={handleSelectGenre}
        />

        {/* MODO 1: Vitrine Principal ("Todos") com os 5 Carrosséis Temáticos a 120 FPS */}
        {activeCatalogView === "todos" ? (
          <HomeFeed
            isFadingOut={isFadingOutHome}
            onSelectMovie={handleOpenDetails}
          />
        ) : (
          /* MODO 2: Modo de Exploração por Gênero com dissolução suave ao sair */
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

      {/* Tela de Detalhes Completa com Atmosfera Cromática Estilo Spotify */}
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
