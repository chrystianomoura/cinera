import { useEffect } from "react";
import { X } from "lucide-react";
import type { Movie } from "@/domain";

interface TrailerModalProps {
  isOpen: boolean;
  movie: Movie | null;
  trailerKey: string | null;
  isLoading: boolean;
  onClose: () => void;
}

export function TrailerModal({
  isOpen,
  movie,
  trailerKey,
  isLoading,
  onClose,
}: TrailerModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Cabeçalho com título centralizado */}
        <div className="relative flex items-center justify-center px-12 py-4 border-b border-white/10 bg-zinc-900/80">
          <h4 className="text-base md:text-lg font-semibold text-white tracking-wide text-center truncate">
            {movie?.title} — Trailer Oficial
          </h4>
          <button
            onClick={onClose}
            className="absolute right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-sm text-zinc-400">
                Carregando trailer...
              </span>
            </div>
          )}
          {!isLoading && trailerKey ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
              title={`${movie?.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : !isLoading ? (
            <div className="p-8 text-center text-zinc-400">
              <p>
                Nenhum trailer encontrado diretamente na API para este filme.
              </p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${movie?.title || ""} trailer oficial`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
              >
                Buscar no YouTube
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
