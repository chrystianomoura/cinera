import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import type { Movie } from "@/domain";
import { MovieCard } from "./MovieCard";
import { StatusMessage } from "@/features/feedback/StatusMessage";
import { getGenreProfile } from "./constants";
import { useScrollTopButton } from "@/hooks/use-scroll-top-button";

interface GenreCatalogGridProps {
  genreName: string;
  movies?: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

export function GenreCatalogGrid({
  genreName,
  movies = [],
  isLoading = false,
  isError = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onSelectMovie,
}: GenreCatalogGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(0);
  const { showScrollTop, scrollToTop } = useScrollTopButton(400);
  const profile = getGenreProfile(genreName);
  const description = profile?.description || "Explorando os títulos mais populares e aclamados deste gênero";

  // Quantas colunas a grade tem agora (2, 3, 4, 5 ou 6, conforme a largura da tela), lido do próprio CSS
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => setColumns(getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [isLoading]);

  // No fim da lista, a última linha sempre fecha completa: sobram de fora, no máximo, colunas - 1 filmes
  const shown = !hasMore && columns > 0 && movies.length >= columns ? movies.slice(0, Math.floor(movies.length / columns) * columns) : movies;

  // Paginação infinita via IntersectionObserver
  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore || !onLoadMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "400px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  return (
    <section className="flex flex-col gap-4 md:gap-9 animate-in fade-in duration-300 px-4 md:px-0">
      <div className="text-center max-w-xl md:max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight [text-wrap:balance] md:[text-wrap:normal]">
          Catálogo de {genreName}
        </h2>
        <p className="text-sm md:text-base text-zinc-400 mt-1 md:mt-2 max-w-[280px] sm:max-w-sm md:max-w-3xl lg:max-w-4xl mx-auto [text-wrap:balance] md:[text-wrap:normal]">
          {description}
        </p>
      </div>

      {isError && (
        <StatusMessage
          emoji="🤯"
          title="Não foi possível carregar este gênero"
          description="Ocorreu um erro ao carregar os filmes deste gênero. Tente novamente mais tarde."
          size="compact"
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 animate-pulse w-full">
              <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900"></div>
              <div className="h-4 w-3/4 rounded bg-zinc-900"></div>
              <div className="h-3 w-1/4 rounded bg-zinc-900"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {shown.map((movie, index) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isEager={index < 12}
                className="w-full"
                onClick={onSelectMovie}
              />
            ))}
          </div>

          {movies.length === 0 && !isError && (
            <StatusMessage
              emoji="😔"
              title="Nenhum filme encontrado"
              description="Nenhum filme qualificado para este gênero no momento."
              size="compact"
            />
          )}

          {hasMore && (
            <div
              ref={sentinelRef}
              className="h-px -mt-4 md:-mt-9 w-full pointer-events-none opacity-0"
              aria-hidden="true"
            />
          )}

          {isLoadingMore && (
            <div className="flex items-center justify-center py-8 gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-white/70" />
              <span className="text-sm font-medium tracking-wide">
                Carregando mais títulos...
              </span>
            </div>
          )}

          {!hasMore && movies.length > 0 && (
            <div className="text-center pt-7 border-t border-white/5">
              <p className="text-sm md:text-base text-zinc-400 uppercase tracking-widest font-semibold">
                O catálogo não acaba aqui.<br />Pesquise e descubra mais.
                <span aria-hidden="true" className="block mt-3 text-4xl md:text-5xl leading-none normal-case tracking-normal">😉</span>
              </p>
            </div>
          )}
        </>
      )}

      {/* Botão flutuante para voltar ao topo */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Voltar ao topo do catálogo"
        title="Voltar ao topo"
        className={`fixed bottom-6 right-6 md:bottom-7 md:right-20 z-40 transform-gpu flex items-center justify-center w-14 h-14 md:w-[60px] md:h-[60px] rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/20 hover:border-white/35 text-zinc-300 hover:text-white backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
          showScrollTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 md:translate-y-0 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-6 h-6 md:w-7 md:h-7 stroke-[2.5] transition-transform duration-200 group-hover:scale-105" />
      </button>
    </section>
  );
}
