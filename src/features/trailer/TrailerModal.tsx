import { useEffect } from "react";
import { X } from "lucide-react";
import { useTrailerStore } from "./use-trailer-store";
import { StatusMessage, statusButtonClassName } from "@/features/feedback/StatusMessage";

export function TrailerModal() {
  const isOpen = useTrailerStore((state) => state.isOpen);
  const movie = useTrailerStore((state) => state.movie);
  const storedTrailerKey = useTrailerStore((state) => state.trailerKey);
  // A chave vem de uma API externa e entra na URL do vídeo: só aceita o formato de ID do YouTube
  const trailerKey = storedTrailerKey && /^[\w-]{6,20}$/.test(storedTrailerKey) ? storedTrailerKey : null;
  const isLoading = useTrailerStore((state) => state.isLoading);
  const onClose = useTrailerStore((state) => state.closeTrailer);

  useEffect(() => {
    if (!isOpen) return;

    // Captura antes dos demais: o ESC fecha só o trailer, sem fechar a tela de detalhes por baixo
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // overflow-y-auto + m-auto no painel: se algum dia o painel ainda passar da tela, ele alinha ao topo e dá para rolar até o botão de
    // fechar (com items-center ele subia para fora da tela e a parte de cima ficava inalcançável). Tocar fora do painel também fecha.
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[90] flex overflow-y-auto p-4 md:p-8 paisagem:p-3 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* A largura máxima também depende da ALTURA da tela: o vídeo é 16:9, então o painel (cabeçalho de ~3,6rem + vídeo) só cabe se a
          largura for no máximo (altura disponível) x 16/9. No celular deitado (tela baixa) isso mantém o botão de fechar à vista. */}
      <div className="relative w-full m-auto max-w-[min(56rem,calc((100dvh-5.75rem)*16/9))] md:max-w-[min(56rem,calc((100dvh-7.75rem)*16/9))] paisagem:max-w-[min(56rem,calc((100dvh-5.2rem)*16/9))] bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
            />
          ) : !isLoading ? (
            <StatusMessage
              emoji="🤯"
              title="Trailer indisponível"
              description="Não encontramos um trailer para este filme. Você pode procurar direto no YouTube."
              size="compact"
            >
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${movie?.title || ""} trailer oficial`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className={statusButtonClassName}
              >
                Buscar no YouTube
              </a>
            </StatusMessage>
          ) : null}
        </div>
      </div>
    </div>
  );
}
