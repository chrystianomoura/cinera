import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/domain";
import { MovieCard } from "./MovieCard";
import { StatusMessage } from "@/features/feedback/StatusMessage";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

interface MovieCarouselProps {
  title: string;
  icon?: ReactNode;
  movies?: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  isEager?: boolean;
  onSelectMovie?: (movie: Movie) => void;
}

export function MovieCarousel({
  title,
  icon,
  movies,
  isLoading = false,
  isError = false,
  isEager = false,
  onSelectMovie,
}: MovieCarouselProps) {
  const {
    containerRef: rowRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  } = useHorizontalScroll({
    defaultScrollFraction: 0.75,
    threshold: 12,
  });

  const safeMovies = movies ?? [];

  // Se ocorreu erro, exibe banner limpo e não renderiza fileira vazia
  if (isError) {
    return (
      <section className="relative group/carousel">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-2 md:mb-3 px-4 md:px-0">
          {icon && <span className="text-xl md:text-2xl select-none">{icon}</span>}
          <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {title}
          </h3>
        </div>
        <StatusMessage
          emoji="🤯"
          title="Não foi possível carregar esta seção"
          description="Ocorreu um erro ao carregar os filmes desta seção. Tente novamente mais tarde."
          size="compact"
        />
      </section>
    );
  }

  // Se não está carregando e a lista está vazia, omite a seção silenciosamente
  if (!isLoading && safeMovies.length === 0) {
    return null;
  }

  return (
    <section className="relative group/carousel">
      <div className="flex items-center gap-2.5 sm:gap-3 mb-2 md:mb-3 px-4 md:px-0">
        {icon && <span className="text-xl md:text-2xl select-none">{icon}</span>}
        <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          {title}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex gap-4 md:gap-6 overflow-hidden pt-1 md:pt-2 px-4 md:px-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 sm:w-44 md:w-52 lg:w-60 flex flex-col gap-3 animate-pulse"
            >
              <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900"></div>
              <div className="h-4 w-3/4 rounded bg-zinc-900"></div>
              <div className="h-3 w-1/4 rounded bg-zinc-900"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Borda de fade esquerda estável via CSS puro */}
          <div
            aria-hidden="true"
            className={`hidden md:block absolute left-0 top-0 bottom-2 w-12 sm:w-16 md:w-20 lg:w-24 bg-gradient-to-r from-black via-black/60 to-transparent z-20 pointer-events-none transition-opacity duration-200 ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />

          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label={`Rolar ${title} para a esquerda`}
            aria-hidden={!canScrollLeft}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`hidden md:flex absolute left-2.5 top-[calc(0.5rem+min(38vw,168px))] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-opacity duration-150 cursor-pointer ${
              canScrollLeft
                ? "opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5] pointer-events-none" />
          </button>

          <div
            ref={rowRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-1 md:pb-2 pt-1 md:pt-2 scrollbar-hide px-4 md:px-0 [overscroll-behavior-x:contain] [will-change:scroll-position] md:[scroll-padding-left:5rem] lg:[scroll-padding-left:6rem]"
          >
            {safeMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isEager={isEager}
                onClick={onSelectMovie}
              />
            ))}
          </div>

          {/* Borda de fade direita estável via CSS puro */}
          <div
            aria-hidden="true"
            className={`hidden md:block absolute right-0 top-0 bottom-2 w-12 sm:w-16 md:w-20 lg:w-24 bg-gradient-to-l from-black via-black/60 to-transparent z-20 pointer-events-none transition-opacity duration-200 ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />

          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label={`Rolar ${title} para a direita`}
            aria-hidden={!canScrollRight}
            tabIndex={canScrollRight ? 0 : -1}
            className={`hidden md:flex absolute right-2.5 top-[calc(0.5rem+min(38vw,168px))] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-opacity duration-150 cursor-pointer ${
              canScrollRight
                ? "opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronRight className="w-6 h-6 stroke-[2.5] pointer-events-none" />
          </button>
        </div>
      )}
    </section>
  );
}
