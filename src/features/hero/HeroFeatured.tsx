import { useState, useEffect } from "react";
import { Play, Info } from "lucide-react";
import type { Movie } from "@/domain";
import { getBackdropUrl } from "@/infrastructure/api/movie-service";

interface HeroFeaturedProps {
  candidates: Movie[];
  isLoading: boolean;
  isTrailerOpen: boolean;
  isVisible?: boolean;
  onOpenTrailer: (movie: Movie) => void;
  onOpenDetails?: (movie: Movie) => void;
}

export function HeroFeatured({
  candidates,
  isLoading,
  isTrailerOpen,
  isVisible = true,
  onOpenTrailer,
  onOpenDetails,
}: HeroFeaturedProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Trava dupla: prioriza estritamente filmes com tagline oficial
  const validCandidates = candidates.filter(
    (m) => Boolean(m.tagline && m.tagline.trim().length > 0),
  );
  const heroList = validCandidates.length > 0 ? validCandidates : candidates;

  const heroMovie =
    heroList.length > 0 ? heroList[heroIndex % heroList.length] : null;

  // Rotação automática a cada 6 segundos com crossfade suave (pausa no hover ou trailer aberto)
  useEffect(() => {
    if (heroList.length <= 1 || isTrailerOpen || isHovered) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % heroList.length);
        setIsFading(false);
      }, 700);
    }, 6000);

    return () => clearInterval(interval);
  }, [heroList.length, isTrailerOpen, isHovered]);

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full min-h-[72vh] md:min-h-[80vh] flex items-end pb-3 sm:pb-4 md:pb-6 px-4 md:px-12 pt-6 md:pt-10 overflow-hidden"
    >
      {(isLoading || !heroMovie) && (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      )}

      {!isLoading && heroMovie && (
        <>
          <div
            className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${
              isFading ? "opacity-0" : "opacity-100"
            }`}
          >
            <img
              key={heroMovie.id}
              src={getBackdropUrl(heroMovie.backdropPath)}
              alt={heroMovie.title}
              className="w-full h-full object-cover object-top animate-kenburns origin-center"
            />

            <div
              className="absolute inset-x-0 bottom-0 h-[38%] pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.2) 75%, transparent 100%)",
              }}
            />
          </div>

          <div
            className={`relative z-10 max-w-3xl lg:max-w-4xl w-full mx-auto md:mx-0 flex flex-col items-center md:items-start transition-all duration-700 transform ${
              isFading || !isVisible
                ? "opacity-0 translate-y-6"
                : "opacity-100 translate-y-0 delay-200"
            }`}
          >
            {(() => {
              const hasTagline = Boolean(
                heroMovie.tagline && heroMovie.tagline.trim().length > 0,
              );
              const titleSpacingClass = hasTagline ? "mb-1.5" : "mb-4 md:mb-5";

              const colonIndex = heroMovie.title.indexOf(":");
              if (colonIndex !== -1) {
                const part1 = heroMovie.title.slice(0, colonIndex).trim();
                const part2 = heroMovie.title.slice(colonIndex + 1).trim();
                const longestPart = Math.max(part1.length, part2.length);

                const fontClasses =
                  longestPart > 32
                    ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
                    : longestPart > 20
                      ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                      : "text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem]";

                return (
                  <h2
                    className={`font-black tracking-tight text-white ${titleSpacingClass} leading-[1.08] drop-shadow-2xl text-center md:text-left [text-wrap:balance] ${fontClasses}`}
                  >
                    <span>{part1}:</span>
                    {part2 && (
                      <span className="block mt-1 text-white/95">
                        {part2}
                      </span>
                    )}
                  </h2>
                );
              }

              const titleLength = heroMovie.title.length;

              const fontClasses =
                titleLength > 32
                  ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
                  : titleLength >= 18
                    ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                    : "text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem]";

              return (
                <h2
                  className={`font-black tracking-tight text-white ${titleSpacingClass} leading-[1.05] drop-shadow-2xl text-center md:text-left [text-wrap:balance] ${fontClasses}`}
                >
                  {heroMovie.title}
                </h2>
              );
            })()}

            {heroMovie.tagline && (
              <p className="text-zinc-200 text-base sm:text-lg md:text-xl font-medium italic leading-snug mb-4 md:mb-5 drop-shadow-md max-w-2xl text-center md:text-left [text-wrap:balance]">
                "{heroMovie.tagline
                  .replace(/^["'“”«»]+|["'“”«»]+$/g, "")
                  .trim()}"
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 w-full">
              <button
                onClick={() => onOpenTrailer(heroMovie)}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black font-bold text-base hover:bg-zinc-200 transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 cursor-pointer group"
              >
                <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                <span>Trailer</span>
              </button>

              <button
                onClick={() => onOpenDetails?.(heroMovie)}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white font-semibold text-base border border-white/15 hover:border-white/35 transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 cursor-pointer group"
              >
                <Info className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                <span>Ver Detalhes</span>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
