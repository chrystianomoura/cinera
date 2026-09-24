import { ChevronLeft, ChevronRight, Image as ImageIcon, ZoomIn } from "lucide-react";
import { getBackdropUrl } from "@/infrastructure/api/movie-service";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

interface GalleryCarouselProps {
  images?: string[];
  isLoading?: boolean;
  onSelectImage?: (index: number) => void;
}

/**
 * Galeria de cenas widescreen com título limpo 'Galeria'
 * e clique para abrir visualização ampliada em janela dedicada.
 */
export function GalleryCarousel({
  images = [],
  isLoading,
  onSelectImage,
}: GalleryCarouselProps) {
  const {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  } = useHorizontalScroll({ defaultScrollFraction: 0.75 });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">Galeria</h3>
        <div className="flex gap-4 overflow-hidden py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video w-64 sm:w-80 rounded-2xl bg-zinc-900 border border-white/5 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="relative flex flex-col gap-4 group/gallery">
      {/* Título Centralizado com controles na lateral */}
      <div className="relative flex items-center justify-center">
        <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center">
          Galeria
        </h3>

        {/* Controles de rolagem */}
        <div className="hidden sm:flex items-center gap-1.5 absolute right-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Rolar galeria para a esquerda"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Rolar galeria para a direita"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-2 [transform:translateZ(0)]"
      >
        {images.map((path, idx) => {
          const imgUrl = getBackdropUrl(path, "w780");

          return (
            <div
              key={idx}
              onClick={() => onSelectImage?.(idx)}
              className="relative aspect-video w-64 sm:w-80 md:w-96 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-white/35 shadow-lg flex-shrink-0 select-none group/item cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {imgUrl ? (
                <>
                  <img
                    src={imgUrl}
                    alt={`Cena do filme ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                  />
                  {/* Overlay sutil com ícone de zoom ao passar o mouse */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
