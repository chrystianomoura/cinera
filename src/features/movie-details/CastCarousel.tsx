import { useMemo } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import type { CastMember } from "@/domain";
import { getProfileUrl } from "@/infrastructure/api/movie-service";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

interface CastCarouselProps {
  cast?: CastMember[];
  isLoading?: boolean;
}

/**
 * Carrossel horizontal do elenco principal.
 */
export function CastCarousel({ cast = [], isLoading }: CastCarouselProps) {
  const {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  } = useHorizontalScroll({ defaultScrollFraction: 0.7 });

  const topCast = useMemo(
    () => cast.filter((actor) => Boolean(actor.profilePath)).slice(0, 18),
    [cast]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Elenco Principal
        </h3>
        <div className="flex gap-4 sm:gap-5 overflow-hidden py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 flex-shrink-0 w-28 sm:w-32 md:w-36 animate-pulse"
            >
              <div className="aspect-[3/4] w-full rounded-2xl bg-zinc-900 border border-white/5" />
              <div className="h-4 w-20 bg-zinc-900 rounded mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topCast.length === 0) {
    return null;
  }

  return (
    <div className="relative flex flex-col gap-4 group/cast">
      <div className="relative flex items-center justify-center">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Elenco Principal
        </h3>

        <div className="hidden sm:flex items-center gap-1.5 absolute right-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Rolar elenco para a esquerda"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Rolar elenco para a direita"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Borda de fade esquerda */}
        <div
          className={`hidden md:block absolute left-0 inset-y-0 w-14 sm:w-20 md:w-28 bg-gradient-to-r from-black from-20% via-black/85 via-50% to-transparent z-20 pointer-events-none transition-opacity ${
            canScrollLeft
              ? "opacity-100 duration-300 ease-out"
              : "opacity-0 duration-700 ease-out"
          }`}
        />

        <div
          ref={containerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-2 px-4 md:px-1"
        >
          {topCast.map((actor) => {
            const profileImg = getProfileUrl(actor.profilePath, "w185");

            return (
              <div
                key={actor.id}
                className="flex flex-col items-center text-center flex-shrink-0 w-28 sm:w-32 md:w-36 select-none group/actor"
              >
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover/actor:border-white/30 shadow-lg mb-2.5 transition-all duration-300 group-hover/actor:scale-105">
                  {profileImg ? (
                    <img
                      src={profileImg}
                      alt={actor.name}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <User className="w-9 h-9" />
                    </div>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover/actor:text-white leading-snug break-words tracking-tight w-full text-center">
                  {actor.name}
                </h4>
              </div>
            );
          })}
          <div className="flex-shrink-0 w-8 sm:w-12 pointer-events-none" aria-hidden="true" />
        </div>

        {/* Borda de fade direita */}
        <div
          className={`hidden md:block absolute right-0 inset-y-0 w-14 sm:w-20 md:w-28 bg-gradient-to-l from-black from-20% via-black/85 via-50% to-transparent z-20 pointer-events-none transition-opacity ${
            canScrollRight
              ? "opacity-100 duration-300 ease-out"
              : "opacity-0 duration-700 ease-out"
          }`}
        />
      </div>
    </div>
  );
}
