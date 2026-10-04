import { useState, useEffect, useRef } from "react";
import { Play, Info } from "lucide-react";
import type { Movie } from "@/domain";
import { getBackdropUrl } from "@/infrastructure/api/movie-service";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useTrailerStore } from "@/features/trailer/use-trailer-store";

interface HeroFeaturedProps {
  candidates: Movie[];
  isLoading: boolean;
  isPaused?: boolean;
  isVisible?: boolean;
  onOpenTrailer: (movie: Movie) => void;
  onOpenDetails?: (movie: Movie) => void;
}

export function HeroFeatured({
  candidates,
  isLoading,
  isPaused = false,
  isVisible = true,
  onOpenTrailer,
  onOpenDetails,
}: HeroFeaturedProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(true);
  const isPageVisible = usePageVisibility();
  const isTrailerOpen = useTrailerStore((state) => state.isOpen);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Congela o Ken Burns no frame exato ao ocultar a aba e retoma do mesmo ponto ao voltar.
  // Aba oculta não renderiza frames: uma classe CSS de pausa só seria aplicada na volta, com o
  // relógio da animação já adiantado (salto de zoom). A pausa via API é aplicada no próprio evento.
  useEffect(() => {
    let frozen: { animation: Animation; time: CSSNumberish | null }[] = [];

    const onVisibilityChange = () => {
      const img = imageRef.current;

      if (document.visibilityState === "hidden") {
        if (!img) return;
        frozen = img
          .getAnimations()
          .filter((animation) => animation.playState === "running")
          .map((animation) => ({ animation, time: animation.currentTime }));
        frozen.forEach(({ animation }) => animation.pause());
        return;
      }

      frozen.forEach(({ animation, time }) => {
        if (animation.playState === "idle") return;
        animation.currentTime = time;
        animation.play();
      });
      frozen = [];
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Monitora visibilidade no viewport: ativo enquanto o Hero ocupa pelo menos 25% da tela
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.25);
      },
      { threshold: [0, 0.25, 0.5, 1.0] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A seleção (catálogo curado ou busca ao vivo) já decide quem pode ser destaque; o filme sem
  // tagline aprovado à mão entra normalmente e o layout simplesmente omite a tagline.
  const heroList = candidates;

  const heroMovie =
    heroList.length > 0 ? heroList[heroIndex % heroList.length] : null;

  // Rotação a cada 7s: congela em modais, fora da tela ou com a aba oculta.
  // Ao retomar, o intervalo recomeça e o usuário vê a foto atual por 7s completos.
  useEffect(() => {
    if (
      heroList.length <= 1 ||
      isTrailerOpen ||
      isPaused ||
      !isVisible ||
      !isInViewport ||
      !isPageVisible
    ) {
      setIsFading(false);
      return;
    }

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      // 1. Desvanece tudo junto suavemente em fade-out aveludado
      setIsFading(true);

      // 2. Após 650ms (quando a imagem e texto dissolveram no breu do cinema), troca o filme e reacende suave
      fadeTimer = setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % heroList.length);
        setIsFading(false);
      }, 650);
    }, 7000);

    return () => {
      clearInterval(interval);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [heroList.length, isTrailerOpen, isPaused, isVisible, isInViewport, isPageVisible]);

  return (
    <section
      ref={sectionRef}
      aria-label="Destaque em cartaz"
      className="relative w-full h-[calc(var(--app-vh,100svh)-124px)] md:h-[calc(100vh-140px)] min-h-[480px] max-h-[760px] flex items-end pb-3 sm:pb-4 md:pb-6 px-4 md:px-12 pt-4 md:pt-6 overflow-hidden bg-black select-none [contain:layout_paint] [isolation:isolate] transform-gpu"
    >
      {(isLoading || !heroMovie) && (
        <div className="absolute inset-0 bg-black animate-pulse" />
      )}

      {!isLoading && heroMovie && (
        <>
          {/* Pôster em destaque, que não troca ao mudar de aba e tem transição sincronizada */}
          <div
            className={`absolute inset-0 overflow-hidden transform-gpu will-change-[opacity] transition-opacity duration-700 ease-in-out ${
              isFading ? "opacity-0" : "opacity-100"
            }`}
          >
            <img
              key={heroMovie.id}
              ref={imageRef}
              src={getBackdropUrl(heroMovie.backdropPath, "w1280")}
              srcSet={`
                ${getBackdropUrl(heroMovie.backdropPath, "w780")} 780w,
                ${getBackdropUrl(heroMovie.backdropPath, "w1280")} 1280w,
                ${getBackdropUrl(heroMovie.backdropPath, "original")} 2560w
              `}
              sizes="min(100vw, 1280px)"
              alt={heroMovie.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.opacity = "0";
              }}
              // A animação fica sempre ligada e só é pausada fora da tela: tirar e recolocar a classe a reiniciava do zero
              // (o zoom saltava de volta) e refazia a camada de GPU da imagem grande no meio da rolagem
              style={{ animationPlayState: isInViewport ? "running" : "paused" }}
              className="w-full h-full object-cover object-center md:object-top origin-center transform-gpu animate-kenburns"
            />

            {/* Gradiente inferior, com reforço vertical no celular */}
            <div
              className="absolute inset-x-0 bottom-0 h-[60%] md:h-[45%] pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.4) 65%, transparent 100%)",
              }}
            />
          </div>

          {/* Textos e CTAs: sincronizados no milissegundo exato com a imagem com aceleração por hardware */}
          <div
            className={`relative z-10 max-w-3xl lg:max-w-4xl w-full mx-auto md:mx-0 flex flex-col items-center md:items-start transform-gpu will-change-[opacity] transition-opacity duration-700 ease-in-out ${
              isFading || !isVisible
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
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
              <p className="text-zinc-100 text-base sm:text-lg md:text-xl font-medium italic leading-snug mb-4 md:mb-5 drop-shadow-md max-w-2xl text-center md:text-left [text-wrap:balance]">
                {heroMovie.tagline
                  .replace(/^["'“”«»]+|["'“”«»]+$/g, "")
                  .trim()}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-3.5 w-full">
              <button
                type="button"
                onClick={() => onOpenTrailer(heroMovie)}
                aria-label={`Assistir ao trailer de ${heroMovie.title}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-sm border border-white hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-200 shadow-md hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Trailer</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDetails?.(heroMovie)}
                aria-label={`Ver detalhes de ${heroMovie.title}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-950/80 backdrop-blur-md hover:bg-zinc-800 text-white font-medium text-sm border border-white/20 hover:border-white/40 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
