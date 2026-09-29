import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/domain";
import { MovieCard } from "./MovieCard";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

interface MovieCarouselProps {
  title: string;
  icon?: React.ReactNode;
  movies?: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  isEager?: boolean;
  onSelectMovie?: (movie: Movie) => void;
}

export function MovieCarousel({
  title,
  icon,
  movies = [],
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
    scrollDuration: 680,
    threshold: 12,
  });

  return (
    <section className="relative group/carousel">
      <div className="flex items-center gap-2.5 sm:gap-3 mb-2 md:mb-5 px-4 md:px-0">
        {icon && <span className="text-xl md:text-2xl select-none">{icon}</span>}
        <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          {title}
        </h3>
      </div>

      {isError && (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center backdrop-blur-sm">
          <p className="text-zinc-400">
            Ocorreu um erro ao carregar os filmes desta seção. Tente novamente mais
            tarde.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex gap-4 md:gap-6 overflow-hidden px-4 md:px-0">
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
          {/* Borda de fade esquerda - rápida, suave e sem flash */}
          <div
            className={`hidden md:block absolute left-0 top-0 bottom-2 w-12 sm:w-16 md:w-20 lg:w-24 bg-gradient-to-r from-black from-30% via-black/70 to-transparent z-20 pointer-events-none transition-opacity duration-200 ease-out ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />

          <button
            onClick={() => scroll("left")}
            aria-label={`Rolar ${title} para a esquerda`}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`hidden md:flex absolute left-2.5 top-[calc(1rem+min(38vw,168px))] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-opacity duration-150 cursor-pointer pointer-events-none ${
              canScrollLeft
                ? "opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5] pointer-events-none" />
          </button>

          <div
            ref={rowRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-1 md:pb-2 pt-1 md:pt-4 scrollbar-hide px-4 md:px-0"
          >
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isEager={isEager}
                onClick={onSelectMovie}
              />
            ))}
          </div>

          {/* Borda de fade direita - rápida, suave e sem flash */}
          <div
            className={`hidden md:block absolute right-0 top-0 bottom-2 w-12 sm:w-16 md:w-20 lg:w-24 bg-gradient-to-l from-black from-30% via-black/70 to-transparent z-20 pointer-events-none transition-opacity duration-200 ease-out ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />

          <button
            onClick={() => scroll("right")}
            aria-label={`Rolar ${title} para a direita`}
            tabIndex={canScrollRight ? 0 : -1}
            className={`hidden md:flex absolute right-2.5 top-[calc(1rem+min(38vw,168px))] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-opacity duration-150 cursor-pointer pointer-events-none ${
              canScrollRight
                ? "opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto"
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
