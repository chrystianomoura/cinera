import { useEffect, useRef } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import type { Movie } from "@/domain";
import { MovieCard } from "./MovieCard";
import { GENRE_PROFILES } from "./constants";
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
  const { showScrollTop, scrollToTop } = useScrollTopButton(400);
  const profile = GENRE_PROFILES[genreName];
  const description = profile?.description || "Explorando os títulos mais populares e aclamados deste gênero";

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
    <section className="flex flex-col gap-8 md:gap-9 pb-16 animate-in fade-in duration-300 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Catálogo de {genreName}
        </h2>
        <p className="text-sm md:text-base text-zinc-400 mt-1.5">
          {description}
        </p>
      </div>

      {isError && (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center backdrop-blur-sm">
          <p className="text-zinc-400">
            Ocorreu um erro ao carregar os filmes deste gênero. Tente novamente mais tarde.
          </p>
        </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {movies.map((movie, index) => (
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
            <div className="rounded-xl bg-zinc-900/30 border border-white/5 p-12 text-center">
              <p className="text-zinc-400 text-base">
                Nenhum filme qualificado encontrado para este gênero no momento.
              </p>
            </div>
          )}

          {hasMore && (
            <div
              ref={sentinelRef}
              className="h-10 w-full pointer-events-none opacity-0"
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
            <div className="text-center py-10 border-t border-white/5 mt-6">
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
                Você chegou ao fim dos títulos deste gênero
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
        className={`fixed bottom-7 right-7 z-40 transform-gpu flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:border-white/30 hover:scale-110 active:scale-95 transition-all duration-300 ease-out cursor-pointer group ${
          showScrollTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5] text-zinc-200 group-hover:text-white transition-transform duration-300 group-hover:-translate-y-0.5" />
      </button>
    </section>
  );
}
