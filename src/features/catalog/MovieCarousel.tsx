import { useMemo } from "react";
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
  } = useHorizontalScroll({ defaultScrollFraction: 0.8 });

  // Máscara com feathering suave não-linear (estilo Apple TV/Netflix) para entrada e saída dos cards
  const carouselMask = useMemo(() => {
    if (!canScrollLeft && !canScrollRight) return "none";

    const leftStops = canScrollLeft
      ? "transparent 0%, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.45) 22px, rgba(0,0,0,0.88) 36px, black 48px"
      : "black 0%";

    const rightStops = canScrollRight
      ? "black calc(100% - 48px), rgba(0,0,0,0.88) calc(100% - 36px), rgba(0,0,0,0.45) calc(100% - 22px), rgba(0,0,0,0.12) calc(100% - 10px), transparent 100%"
      : "black 100%";

    return `linear-gradient(to right, ${leftStops}, ${rightStops})`;
  }, [canScrollLeft, canScrollRight]);

  return (
    <section className="relative group/carousel">
      {/* Título com respiro elegante */}
      <div className="flex items-center gap-3 mb-5">
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
        <div className="flex gap-4 md:gap-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 md:w-48 lg:w-56 flex flex-col gap-3 animate-pulse"
            >
              <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900"></div>
              <div className="h-4 w-3/4 rounded bg-zinc-900"></div>
              <div className="h-3 w-1/4 rounded bg-zinc-900"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Botão flutuante esquerdo (sem backdrop-blur pesado para não onerar o compositor) */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              aria-label={`Rolar ${title} para a esquerda`}
              className="hidden md:flex absolute left-2.5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-950/90 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          <div
            ref={rowRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-2 pt-4 scrollbar-hide"
            style={{
              maskImage: carouselMask,
              WebkitMaskImage: carouselMask,
            }}
          >
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isEager={isEager}
                onClick={onSelectMovie}
              />
            ))}
            {/* Espaçador final para absorver o fade e permitir visualização completa do último card */}
            <div className="flex-shrink-0 w-12 md:w-16 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Botão flutuante direito (sem backdrop-blur pesado para não onerar o compositor) */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              aria-label={`Rolar ${title} para a direita`}
              className="hidden md:flex absolute right-2.5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-950/90 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
