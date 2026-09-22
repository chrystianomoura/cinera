import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/domain";
import { MovieCard } from "./MovieCard";

interface TrendingCarouselProps {
  movies?: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  onSelectMovie?: (movie: Movie) => void;
}

export function TrendingCarousel({
  movies = [],
  isLoading = false,
  isError = false,
  onSelectMovie,
}: TrendingCarouselProps) {
  const trendingRowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeftTrending, setCanScrollLeftTrending] = useState(false);
  const [canScrollRightTrending, setCanScrollRightTrending] = useState(true);

  // Cache das dimensões para eliminar FORCED LAYOUT (Reflow) durante a rolagem
  const maxScrollRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const updateMeasurements = useCallback(() => {
    const el = trendingRowRef.current;
    if (!el) return;
    maxScrollRef.current = el.scrollWidth - el.clientWidth;
  }, []);

  useEffect(() => {
    const el = trendingRowRef.current;
    if (!el) return;

    updateMeasurements();

    let lastLeft = el.scrollLeft > 2;
    let lastRight = el.scrollLeft < maxScrollRef.current - 2;

    const syncState = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft < maxScrollRef.current - 2;
      if (left !== lastLeft) {
        lastLeft = left;
        setCanScrollLeftTrending(left);
      }
      if (right !== lastRight) {
        lastRight = right;
        setCanScrollRightTrending(right);
      }
    };

    let timer: number | null = null;
    const onScroll = () => {
      // Disparo no frame seguinte via RAF para NÃO competir com a thread do compositor
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const left = el.scrollLeft > 2;
        const right = el.scrollLeft < maxScrollRef.current - 2;
        if (left !== lastLeft) {
          lastLeft = left;
          setCanScrollLeftTrending(left);
        }
        if (right !== lastRight) {
          lastRight = right;
          setCanScrollRightTrending(right);
        }
      });

      if (timer) clearTimeout(timer);
      timer = window.setTimeout(syncState, 60);
    };

    const onResize = () => {
      updateMeasurements();
      syncState();
    };

    syncState();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (timer) clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [movies, updateMeasurements]);

  const scrollTrending = (direction: "left" | "right") => {
    const el = trendingRowRef.current;
    if (!el) return;
    // Ativação instantânea antes de iniciar a rolagem suave
    if (direction === "right") {
      setCanScrollLeftTrending(true);
    }
    const scrollAmount = Math.max(Math.floor(el.clientWidth * 0.8), 500);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Máscara com feathering suave não-linear (estilo Apple TV/Netflix) para entrada e saída dos cards
  const trendingMask = useMemo(() => {
    if (!canScrollLeftTrending && !canScrollRightTrending) return "none";

    const leftStops = canScrollLeftTrending
      ? "transparent 0%, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.45) 22px, rgba(0,0,0,0.88) 36px, black 48px"
      : "black 0%";

    const rightStops = canScrollRightTrending
      ? "black calc(100% - 48px), rgba(0,0,0,0.88) calc(100% - 36px), rgba(0,0,0,0.45) calc(100% - 22px), rgba(0,0,0,0.12) calc(100% - 10px), transparent 100%"
      : "black 100%";

    return `linear-gradient(to right, ${leftStops}, ${rightStops})`;
  }, [canScrollLeftTrending, canScrollRightTrending]);

  return (
    <section className="relative group/carousel">
      {/* TÍTULO EM ALTA: Margem inferior de mb-6 para dar espaço aos cards */}
      <h3 className="text-3xl font-semibold mb-6 text-white tracking-tight">
        Em Alta
      </h3>

      {isError && (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center backdrop-blur-sm">
          <p className="text-zinc-400">
            Ocorreu um erro ao carregar os filmes. Tente novamente mais
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
          {canScrollLeftTrending && (
            <button
              onClick={() => scrollTrending("left")}
              aria-label="Rolar filmes em alta para a esquerda"
              className="hidden md:flex absolute left-2.5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-zinc-950/90 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          <div
            ref={trendingRowRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-4 scrollbar-hide"
            style={{
              maskImage: trendingMask,
              WebkitMaskImage: trendingMask,
            }}
          >
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onClick={onSelectMovie} />
            ))}
            {/* Espaçador final para absorver o fade e permitir visualização completa do último card */}
            <div className="flex-shrink-0 w-12 md:w-16 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Botão flutuante direito (sem backdrop-blur pesado para não onerar o compositor) */}
          {canScrollRightTrending && (
            <button
              onClick={() => scrollTrending("right")}
              aria-label="Rolar filmes em alta para a direita"
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
