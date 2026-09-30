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
export function CastCarousel({ cast, isLoading }: CastCarouselProps) {
  const {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  } = useHorizontalScroll({
    defaultScrollFraction: 0.75,
    scrollDuration: 680,
    threshold: 12,
  });

  const topCast = useMemo(
    () => (cast ?? []).filter((actor) => Boolean(actor.profilePath)).slice(0, 18),
    [cast]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Elenco Principal
        </h3>
        <div className="flex gap-4 sm:gap-5 overflow-hidden py-2 px-4 md:px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center flex-shrink-0 w-28 sm:w-32 md:w-36 animate-pulse"
            >
              <div className="aspect-[3/4] w-full rounded-xl bg-zinc-900 border border-white/5 mb-2.5" />
              <div className="h-4 w-20 bg-zinc-900 rounded" />
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
            type="button"
            disabled={!canScrollLeft}
            onClick={() => scroll("left")}
            aria-label="Rolar elenco para a esquerda"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 pointer-events-none" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => scroll("right")}
            aria-label="Rolar elenco para a direita"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Borda de fade esquerda - instantâneo (0ms) */}
        {canScrollLeft && (
          <div
            className="hidden md:block absolute left-0 inset-y-0 w-12 sm:w-16 md:w-20 bg-gradient-to-r from-black via-black/60 to-transparent z-20 pointer-events-none"
          />
        )}

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
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 group-hover/actor:border-white/30 shadow-md mb-2.5 transition-transform duration-300 ease-out group-hover/actor:scale-105">
                  {profileImg ? (
                    <img
                      src={profileImg}
                      alt={actor.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <User className="w-9 h-9" />
                    </div>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover/actor:text-white leading-snug break-words tracking-tight w-full text-center line-clamp-2">
                  {actor.name}
                </h4>
              </div>
            );
          })}
        </div>

        {/* Borda de fade direita - instantâneo (0ms) */}
        {canScrollRight && (
          <div
            className="hidden md:block absolute right-0 inset-y-0 w-12 sm:w-16 md:w-20 bg-gradient-to-l from-black via-black/60 to-transparent z-20 pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}
