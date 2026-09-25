import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getBackdropUrl } from "@/infrastructure/api/movie-service";

interface PhotoModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  movieTitle?: string;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
}

/**
 * Modal em janela dedicada para visualização de fotos das filmagens em alta resolução.
 * Estilo visual padronizado com o TrailerModal, com navegação lateral por teclado e botões de seta com prefetch instantâneo.
 */
export function PhotoModal({
  isOpen,
  images,
  currentIndex,
  movieTitle,
  onClose,
  onSelectIndex,
}: PhotoModalProps) {
  const total = images.length;
  const currentPath = images[currentIndex];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        onSelectIndex(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < total - 1) {
        onSelectIndex(currentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, currentIndex, total, onSelectIndex]);

  // Pré-carregamento em background das fotos adjacentes para navegação instantânea (0ms)
  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const preloadTargets = [
      currentIndex + 1,
      currentIndex + 2,
      currentIndex - 1,
    ].filter((idx) => idx >= 0 && idx < total);

    preloadTargets.forEach((idx) => {
      const url = getBackdropUrl(images[idx], "w1280");
      if (url) {
        const preloadImg = new Image();
        preloadImg.src = url;
      }
    });
  }, [isOpen, images, currentIndex, total]);


  if (!isOpen || !currentPath) return null;

  const photoUrl = getBackdropUrl(currentPath, "w1280");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de fotos em alta resolução"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col cursor-default"
      >
        {/* Cabeçalho minimalista com nome do filme centralizado */}
        <div className="relative flex items-center justify-center px-12 py-4 border-b border-white/10 bg-zinc-900/80">
          <h4 className="text-sm md:text-base font-bold text-white tracking-wide text-center truncate">
            {movieTitle}
          </h4>

          <button
            onClick={onClose}
            className="absolute right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área da Imagem em Alta Resolução */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
          <img
            key={currentPath}
            src={photoUrl}
            alt={`Cena do filme ${currentIndex + 1}`}
            draggable={false}
            decoding="async"
            className="w-full h-full object-contain select-none"
          />

          {/* Botão Foto Anterior */}
          {currentIndex > 0 ? (
            <button
              onClick={() => onSelectIndex(currentIndex - 1)}
              aria-label="Foto anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-white text-white hover:text-black border border-white/20 shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          ) : null}

          {/* Botão Próxima Foto */}
          {currentIndex < total - 1 ? (
            <button
              onClick={() => onSelectIndex(currentIndex + 1)}
              aria-label="Próxima foto"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-white text-white hover:text-black border border-white/20 shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronRight className="w-6 h-6 stroke-[2.5]" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
