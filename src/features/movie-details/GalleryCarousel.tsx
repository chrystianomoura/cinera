import { memo, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, ZoomIn } from "lucide-react";
import { getBackdropUrl } from "@/infrastructure/api/movie-service";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

interface GalleryCarouselProps {
  images?: string[];
  isLoading?: boolean;
  onSelectImage?: (index: number) => void;
}

interface GalleryItemProps {
  path: string;
  idx: number;
  isInteractive: boolean;
  onSelectImage?: (index: number) => void;
}

const GalleryItem = memo(function GalleryItem({ path, idx, isInteractive, onSelectImage }: GalleryItemProps) {
  const [hasError, setHasError] = useState(false);
  const imgUrl = getBackdropUrl(path, "w780");

  return (
    <button
      type="button"
      disabled={!isInteractive}
      aria-label={isInteractive ? `Ampliar cena ${idx + 1}` : undefined}
      onClick={isInteractive ? () => onSelectImage?.(idx) : undefined}
      className={`relative aspect-video w-64 sm:w-80 md:w-96 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-md flex-shrink-0 group/item transition-colors duration-200 text-left p-0 [contain:layout_style] ${
        isInteractive
          ? "cursor-pointer hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          : "cursor-default disabled:pointer-events-none"
      }`}
    >
      {imgUrl && !hasError ? (
        <>
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            decoding="async"
            width={384}
            height={216}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover pointer-events-none"
          />
          {isInteractive && (
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 ease-out flex items-center justify-center pointer-events-none">
              <span className="w-10 h-10 rounded-full bg-zinc-950/90 border border-white/20 flex items-center justify-center text-white shadow-xl">
                <ZoomIn aria-hidden="true" className="w-5 h-5 pointer-events-none" />
              </span>
            </span>
          )}
        </>
      ) : (
        <span className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600 bg-zinc-900/80">
          <ImageIcon aria-hidden="true" className="w-8 h-8 opacity-40" />
          <span className="text-[11px] font-medium tracking-wide text-zinc-500">Cena indisponível</span>
        </span>
      )}
    </button>
  );
});

/**
 * Galeria de cenas widescreen com título limpo 'Galeria'
 * e clique para abrir visualização ampliada em janela dedicada.
 */
export function GalleryCarousel({
  images,
  isLoading,
  onSelectImage,
}: GalleryCarouselProps) {
  const safeImages = images ?? [];

  const {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  } = useHorizontalScroll({
    defaultScrollFraction: 0.75,
    threshold: 12,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Galeria
        </h3>
        <div className="flex gap-4 sm:gap-5 overflow-hidden py-2 px-4 md:px-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video w-64 sm:w-80 md:w-96 rounded-xl bg-zinc-900 border border-white/5 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (safeImages.length === 0) {
    return null;
  }

  const isInteractive = Boolean(onSelectImage);

  return (
    <div className="relative flex flex-col gap-4">
      {/* Título Centralizado com controles na lateral */}
      <div className="relative flex items-center justify-center">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Galeria
        </h3>

        {/* Controles de rolagem */}
        <div className="hidden sm:flex items-center gap-1.5 absolute right-0">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => scroll("left")}
            aria-label="Rolar galeria para a esquerda"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-30 disabled:pointer-events-none disabled:cursor-default"
          >
            <ChevronLeft aria-hidden="true" className="w-4 h-4 pointer-events-none" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => scroll("right")}
            aria-label="Rolar galeria para a direita"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-30 disabled:pointer-events-none disabled:cursor-default"
          >
            <ChevronRight aria-hidden="true" className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Borda de fade esquerda estável via CSS puro */}
        <div
          aria-hidden="true"
          className={`hidden md:block absolute left-0 inset-y-0 w-12 sm:w-16 md:w-20 bg-gradient-to-r from-black via-black/60 to-transparent z-20 pointer-events-none transition-opacity duration-200 ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={containerRef}
          role="region"
          aria-label="Carrossel da galeria"
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-2 px-4 md:px-0 [overscroll-behavior-x:contain] [will-change:scroll-position]"
        >
          {safeImages.map((path, idx) => (
            <GalleryItem
              key={`${idx}-${path}`}
              path={path}
              idx={idx}
              isInteractive={isInteractive}
              onSelectImage={onSelectImage}
            />
          ))}
        </div>

        {/* Borda de fade direita estável via CSS puro */}
        <div
          aria-hidden="true"
          className={`hidden md:block absolute right-0 inset-y-0 w-12 sm:w-16 md:w-20 bg-gradient-to-l from-black via-black/60 to-transparent z-20 pointer-events-none transition-opacity duration-200 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}