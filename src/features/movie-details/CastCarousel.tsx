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
 * Carrossel horizontal de elenco principal.
 * Exibe apenas atores com foto cadastrada no TMDB em cards verticais nobres (aspect 3:4),
 * preservando 100% o enquadramento do rosto (sem cortar testa ou queixo).
 * Foco exclusivo no nome do artista, com título centralizado.
 */
export function CastCarousel({ cast = [], isLoading }: CastCarouselProps) {
  const {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  } = useHorizontalScroll({ defaultScrollFraction: 0.7 });

  // Filtra atores com foto no perfil TMDB e limita aos 18 principais (memorizado para estabilidade)
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
      {/* Título de Elenco Centralizado com botões de navegação na lateral direita */}
      <div className="relative flex items-center justify-center">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Elenco Principal
        </h3>

        {/* Controles de rolagem discreto */}
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
        {/* Edge Fade Esquerdo (visível apenas quando o usuário rolou para a direita e precisa voltar) */}
        <div
          className={`absolute left-0 inset-y-0 w-14 sm:w-20 md:w-28 bg-gradient-to-r from-black from-20% via-black/85 via-50% to-transparent z-20 pointer-events-none transition-opacity ${
            canScrollLeft
              ? "opacity-100 duration-300 ease-out"
              : "opacity-0 duration-700 ease-out"
          }`}
        />

        <div
          ref={containerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-2 px-1"
        >
          {topCast.map((actor) => {
            const profileImg = getProfileUrl(actor.profilePath, "w185");

            return (
              <div
                key={actor.id}
                className="flex flex-col items-center text-center flex-shrink-0 w-28 sm:w-32 md:w-36 select-none group/actor"
              >
                {/* Card Vertical Nobre (aspect 3:4) - Não Clicável, sem corte na cabeça */}
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

                {/* Nome do Artista em destaque limpo, sem personagem */}
                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover/actor:text-white leading-snug break-words tracking-tight w-full text-center">
                  {actor.name}
                </h4>
              </div>
            );
          })}
          {/* Espaçador final para absorver o fade e exibir perfeitamente o último card */}
          <div className="flex-shrink-0 w-8 sm:w-12 pointer-events-none" aria-hidden="true" />
        </div>

        {/* Edge Fade Direito (esfumaça os próximos atores até o fim do trilho) */}
        <div
          className={`absolute right-0 inset-y-0 w-14 sm:w-20 md:w-28 bg-gradient-to-l from-black from-20% via-black/85 via-50% to-transparent z-20 pointer-events-none transition-opacity ${
            canScrollRight
              ? "opacity-100 duration-300 ease-out"
              : "opacity-0 duration-700 ease-out"
          }`}
        />
      </div>
    </div>
  );
}
