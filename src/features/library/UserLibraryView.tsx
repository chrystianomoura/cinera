import { useState, useId, useEffect } from "react";
import {
  X,
  Bookmark,
  Check,
  Trash2,
  Film,
  Sparkles,
} from "lucide-react";
import type { Movie } from "@/domain";
import { useUserLibrary } from "@/stores/use-user-library";
import { useLibraryMovies } from "@/hooks/use-library-movies";
import { getPosterUrl } from "@/infrastructure/api/movie-service";

interface UserLibraryViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export function UserLibraryView({
  isOpen,
  onClose,
  onSelectMovie,
}: UserLibraryViewProps) {
  const [activeTab, setActiveTab] = useState<"watchlist" | "watched">("watchlist");

  const watchlistIds = useUserLibrary((state) => state.watchlist);
  const watchedIds = useUserLibrary((state) => state.watched);
  const toggleWatchlist = useUserLibrary((state) => state.toggleWatchlist);
  const toggleWatched = useUserLibrary((state) => state.toggleWatched);

  // Carrega os dados dos filmes salvos
  const { movies: watchlistMovies, isLoading: isLoadingWatchlist } =
    useLibraryMovies(watchlistIds);
  const { movies: watchedMovies, isLoading: isLoadingWatched } =
    useLibraryMovies(watchedIds);

  const titleId = useId();

  // Fecha com ESC
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

  // Trava scroll de fundo
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMovies = activeTab === "watchlist" ? watchlistMovies : watchedMovies;
  const currentCount = activeTab === "watchlist" ? watchlistIds.length : watchedIds.length;
  const isLoading = activeTab === "watchlist" ? isLoadingWatchlist : isLoadingWatched;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300 overflow-y-auto"
    >
      {/* Topo / Header da Biblioteca (Identidade Consistente Cinera) */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 md:px-12 py-2.5 md:py-3 flex items-center justify-between">
        <h1 className="tracking-widest font-black text-2xl sm:text-3xl md:text-[2.65rem] leading-none text-white uppercase font-serif flex-shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          Cinera
        </h1>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar (Esc)"
          title="Fechar (Esc)"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 hover:bg-white text-zinc-300 hover:text-black border border-white/20 transition-all duration-200 cursor-pointer shadow-lg group active:scale-95"
        >
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
            Voltar
          </span>
          <X className="w-4 h-4 stroke-[2.5] transition-transform group-hover:rotate-90" />
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-12 py-8 flex flex-col items-center">
        {/* Switcher Estratégico com GAP um pouco maior e refinado */}
        <div className="inline-flex p-1.5 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-2xl relative mb-8 select-none gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("watchlist")}
            className={`relative flex items-center gap-2.5 px-6 sm:px-8 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-tight transition-all duration-200 cursor-pointer ${
              activeTab === "watchlist"
                ? "bg-white text-black shadow-[0_2px_14px_rgba(255,255,255,0.25)] scale-100"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bookmark size={16} strokeWidth={2.4} />
            <span>Quero Assistir</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === "watchlist"
                  ? "bg-black/15 text-black"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {watchlistIds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("watched")}
            className={`relative flex items-center gap-2.5 px-6 sm:px-8 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-tight transition-all duration-200 cursor-pointer ${
              activeTab === "watched"
                ? "bg-white text-black shadow-[0_2px_14px_rgba(255,255,255,0.25)] scale-100"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Check size={16} strokeWidth={2.8} />
            <span>Já Assisti</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === "watched"
                  ? "bg-black/15 text-black"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {watchedIds.length}
            </span>
          </button>
        </div>

        {/* Estado Carregando */}
        {isLoading && currentMovies.length === 0 && currentCount > 0 && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400 animate-pulse">
            <Film size={36} className="text-zinc-600 animate-spin" />
            <p className="text-sm font-medium">Carregando seus títulos salvos...</p>
          </div>
        )}

        {/* Empty State Estratégico: Espaçamento harmônico e coeso com o centro */}
        {!isLoading && currentCount === 0 && (
          <div className="pt-8 pb-16 max-w-md mx-auto text-center flex flex-col items-center justify-center animate-in fade-in duration-300 select-none">
            <span className="text-5xl sm:text-6xl leading-none transition-transform hover:scale-110 duration-200 drop-shadow-md mb-3">
              😔
            </span>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {activeTab === "watchlist"
                  ? "Sua fila de espera está vazia"
                  : "Nenhum filme assistido ainda"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
                {activeTab === "watchlist"
                  ? "Navegue pelo catálogo e adicione filmes para montar sua próxima maratona de cinema."
                  : "Conforme for assistindo aos filmes, marque-os como assistidos para registrar sua jornada."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.18)]"
            >
              <Sparkles size={14} />
              <span>Explorar Catálogo</span>
            </button>
          </div>
        )}

        {/* Grid de Filmes */}
        {currentMovies.length > 0 && (
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5 animate-in fade-in duration-300">
            {currentMovies.map((movie) => {
              const posterUrl = movie.posterPath
                ? getPosterUrl(movie.posterPath, "w342")
                : "";
              const releaseYear = movie.releaseDate?.slice(0, 4) || "—";

              return (
                <div
                  key={movie.id}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/60 border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5"
                >
                  {/* Pôster Clicável */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectMovie(movie)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectMovie(movie);
                      }
                    }}
                    className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-900 cursor-pointer"
                  >
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-zinc-500">
                        <Film size={24} className="mb-2 text-zinc-600" />
                        <span className="text-[11px] font-semibold text-zinc-400 line-clamp-2">
                          {movie.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metadados limpos com lixeira discreta no canto inferior direito */}
                  <div className="p-2.5 flex items-end justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4
                        onClick={() => onSelectMovie(movie)}
                        className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer text-zinc-200 hover:text-white transition-colors"
                        title={movie.title}
                      >
                        {movie.title}
                      </h4>
                      <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                        {releaseYear}
                      </span>
                    </div>

                    {/* Botão de Lixeira discreto no canto inferior direito */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTab === "watchlist") {
                          toggleWatchlist(movie.id);
                        } else {
                          toggleWatched(movie.id);
                        }
                      }}
                      aria-label="Remover filme"
                      title={activeTab === "watchlist" ? "Remover de Quero Assistir" : "Remover de Já Assisti"}
                      className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
