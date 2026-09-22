import { useState, useEffect } from "react";
import { Play, Info } from "lucide-react";
import type { Movie } from "@/domain";
import { getBackdropUrl } from "@/infrastructure/api/movie-service";
import { formatRuntime } from "@/lib/formatters";

interface HeroFeaturedProps {
  candidates: Movie[];
  isLoading: boolean;
  isTrailerOpen: boolean;
  isVisible?: boolean;
  onOpenTrailer: (movie: Movie) => void;
}

export function HeroFeatured({
  candidates,
  isLoading,
  isTrailerOpen,
  isVisible = true,
  onOpenTrailer,
}: HeroFeaturedProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const heroMovie =
    candidates.length > 0 ? candidates[heroIndex % candidates.length] : null;

  // Rotação automática a cada 8 segundos com crossfade suave (pausa no hover ou trailer aberto)
  useEffect(() => {
    if (candidates.length <= 1 || isTrailerOpen || isHovered) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % candidates.length);
        setIsFading(false);
      }, 700);
    }, 8000);

    return () => clearInterval(interval);
  }, [candidates.length, isTrailerOpen, isHovered]);

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full min-h-[80vh] md:min-h-[88vh] flex items-end pb-12 px-6 md:px-12 pt-24 md:pt-28 overflow-hidden"
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
            {/* Vinheta anamórfica no canto superior esquerdo: protege a logo Cinera em fundos claros */}
            <div className="absolute top-0 left-0 w-80 md:w-96 h-36 bg-[radial-gradient(ellipse_at_top_left,_rgba(0,0,0,0.45)_0%,_transparent_75%)] pointer-events-none" />

            {/* Degradê superior sutil para contraste da logo e busca */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/25 via-black/5 to-transparent pointer-events-none" />

            {/* Degradê inferior cinematográfico */}
            <div
              className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.2) 75%, transparent 100%)",
              }}
            />
          </div>

          <div
            className={`relative z-10 max-w-3xl transition-all duration-700 transform ${
              isFading || !isVisible
                ? "opacity-0 translate-y-6"
                : "opacity-100 translate-y-0 delay-200"
            }`}
          >
            {/* 1. TÍTULO PRINCIPAL: se contiver dois pontos (:), quebra a linha */}
            {(() => {
              const colonIndex = heroMovie.title.indexOf(":");
              if (colonIndex !== -1) {
                const part1 = heroMovie.title.slice(0, colonIndex).trim();
                const part2 = heroMovie.title.slice(colonIndex + 1).trim();
                const longestPart = Math.max(part1.length, part2.length);

                return (
                  <h2
                    className={`font-black tracking-tight text-white mb-2.5 leading-[1.08] drop-shadow-2xl max-w-3xl ${
                      longestPart > 24
                        ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                        : "text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                    }`}
                  >
                    <span>{part1}:</span>
                    {part2 && (
                      <>
                        <br />
                        <span>{part2}</span>
                      </>
                    )}
                  </h2>
                );
              }

              return (
                <h2
                  className={`font-black tracking-tight text-white mb-2.5 leading-[1.08] drop-shadow-2xl ${
                    heroMovie.title.length > 32
                      ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-2xl"
                      : heroMovie.title.length > 18
                        ? "text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-2xl"
                        : "text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-xl"
                  }`}
                >
                  {heroMovie.title}
                </h2>
              );
            })()}

            {/* 2. META-DADOS LIMPOS: Tipografia pura, alinhada à esquerda */}
            {(() => {
              const rawGenre = heroMovie.genres?.[0]?.name || null;
              const heroGenre = rawGenre ? rawGenre.toUpperCase() : null;
              const releaseYear = heroMovie.releaseDate
                ? heroMovie.releaseDate.slice(0, 4)
                : null;
              const runtimeFormatted = formatRuntime(heroMovie.runtime);

              return (
                <div className="flex flex-wrap items-center gap-2.5 md:gap-3 mb-3 text-sm md:text-base">
                  {heroGenre && (
                    <span className="font-bold text-white tracking-wider uppercase text-xs md:text-sm drop-shadow-md">
                      {heroGenre}
                    </span>
                  )}

                  {heroGenre && releaseYear && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                  )}

                  {releaseYear && (
                    <span className="font-semibold text-white text-xs md:text-sm drop-shadow-md">
                      {releaseYear}
                    </span>
                  )}

                  {releaseYear && runtimeFormatted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                  )}

                  {runtimeFormatted && (
                    <span className="font-semibold text-white text-xs md:text-sm drop-shadow-md">
                      {runtimeFormatted}
                    </span>
                  )}

                  {(heroGenre || releaseYear || runtimeFormatted) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                  )}

                  {/* Badge IMDb clássica de alto contraste */}
                  <div className="flex items-center rounded overflow-hidden shadow-sm border border-black/30">
                    <span className="bg-[#f5c518] text-black text-xs font-black px-1.5 py-0.5 tracking-wider uppercase">
                      IMDb
                    </span>
                    <span className="bg-black/75 text-white text-xs font-bold px-2 py-0.5 backdrop-blur-md">
                      {heroMovie.voteAverage.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 3. TAGLINE OFICIAL DO FILME */}
            {heroMovie.tagline && (
              <p className="text-zinc-200 text-base sm:text-lg md:text-xl font-medium italic mb-6 drop-shadow-md max-w-2xl">
                {heroMovie.tagline
                  .replace(/^["'“”«»]+|["'“”«»]+$/g, "")
                  .trim()}
              </p>
            )}

            {/* BOTÕES DE AÇÃO: Trailer e Ver Detalhes */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => onOpenTrailer(heroMovie)}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black font-bold text-base hover:bg-zinc-200 transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 cursor-pointer group"
              >
                <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                <span>Trailer</span>
              </button>

              <button
                disabled
                title="Página de detalhes em desenvolvimento"
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-zinc-900/40 text-zinc-500 font-semibold text-base border border-white/5 cursor-not-allowed select-none"
              >
                <Info className="w-5 h-5 text-zinc-500" />
                <span>Ver Detalhes</span>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
