import { useState, useId, useEffect, useMemo, useRef } from "react";
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
import { BrandLogo } from "@/features/header/BrandLogo";
import { StatusMessage, statusButtonClassName } from "@/features/feedback/StatusMessage";

interface UserLibraryViewProps {
  isOpen: boolean;
  isLibraryActive?: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export function UserLibraryView({
  isOpen,
  isLibraryActive = true,
  onClose,
  onSelectMovie,
}: UserLibraryViewProps) {
  const [activeTab, setActiveTab] = useState<"watchlist" | "watched">("watchlist");

  const watchlistIds = useUserLibrary((state) => state.watchlist);
  const watchedIds = useUserLibrary((state) => state.watched);
  const toggleWatchlist = useUserLibrary((state) => state.toggleWatchlist);
  const toggleWatched = useUserLibrary((state) => state.toggleWatched);
  const savedMovies = useUserLibrary((state) => state.movies);
  const rememberMovies = useUserLibrary((state) => state.rememberMovies);

  // Só busca na rede os filmes salvos sem resumo (salvos antes desta versão): os demais aparecem na hora
  const watchlistMissing = useMemo(() => watchlistIds.filter((id) => !savedMovies[id]), [watchlistIds, savedMovies]);
  const watchedMissing = useMemo(() => watchedIds.filter((id) => !savedMovies[id]), [watchedIds, savedMovies]);
  const { movies: fetchedWatchlist, isLoading: isLoadingWatchlist } =
    useLibraryMovies(watchlistMissing, isLibraryActive);
  const { movies: fetchedWatched, isLoading: isLoadingWatched } =
    useLibraryMovies(watchedMissing, isLibraryActive);

  // Completa o resumo dos filmes recém-buscados para as próximas aberturas
  useEffect(() => {
    if (fetchedWatchlist.length > 0) rememberMovies(fetchedWatchlist);
  }, [fetchedWatchlist, rememberMovies]);
  useEffect(() => {
    if (fetchedWatched.length > 0) rememberMovies(fetchedWatched);
  }, [fetchedWatched, rememberMovies]);

  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollLibraryToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    containerRef.current?.scrollTo({ top: 0, behavior: prefersReducedMotion ? "instant" : "smooth" });
  };

  // Fecha com ESC (protegendo caso esteja digitando em inputs)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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

  const currentIds = activeTab === "watchlist" ? watchlistIds : watchedIds;
  const fetchedMovies = activeTab === "watchlist" ? fetchedWatchlist : fetchedWatched;
  const currentCount = currentIds.length;
  const isLoading = activeTab === "watchlist" ? isLoadingWatchlist : isLoadingWatched;

  // Cada ID ocupa o seu lugar na ordem salva: resumo guardado, senão o que chegou da rede, senão um
  // espaço reservado (a grade nunca se reorganiza enquanto os filmes chegam)
  const slots = currentIds.flatMap((id): { id: number; movie: Movie | undefined }[] => {
    const movie: Movie | undefined = savedMovies[id] ?? fetchedMovies.find((m) => m.id === id);
    if (movie) return [{ id, movie }];
    return isLoading ? [{ id, movie: undefined }] : [];
  });

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300 overflow-y-auto"
    >
      {/* Topo / Header da Biblioteca (Identidade Consistente Cinera) */}
      <div className="sticky top-0 z-20 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 md:px-12 header-bar flex items-center justify-between">
        <BrandLogo onClick={scrollLibraryToTop} titleId={titleId} />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar biblioteca"
          title="Fechar (Esc)"
          className="flex items-center gap-2 px-4 h-9 sm:h-10 rounded-full bg-zinc-800/80 hover:bg-white text-zinc-300 hover:text-black border border-white/20 transition-all duration-200 cursor-pointer shadow-lg group active:scale-95"
        >
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
            Voltar
          </span>
          <X className="w-4 h-4 stroke-[2.5] transition-transform group-hover:rotate-90" />
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-12 pt-8 pb-page-end flex flex-col items-center">
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

        {/* Empty State Estratégico: exibido quando não há itens */}
        {!isLoading && currentCount === 0 && (
          <StatusMessage
            emoji="😔"
            titleAs="h2"
            title={
              activeTab === "watchlist"
                ? "Sua fila de espera está vazia"
                : "Nenhum filme assistido ainda"
            }
            description={
              activeTab === "watchlist"
                ? "Navegue pelo catálogo e adicione filmes para montar sua próxima maratona de cinema."
                : "Conforme for assistindo aos filmes, marque-os como assistidos para registrar sua jornada."
            }
          >
            <button type="button" onClick={onClose} className={statusButtonClassName}>
              <Sparkles size={14} />
              <span>Explorar Catálogo</span>
            </button>
          </StatusMessage>
        )}

        {/* Grid de Filmes */}
        {slots.length > 0 && (
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
            {slots.map(({ id, movie }) =>
              movie ? (
              <LibraryMovieCard
                key={id}
                movie={movie}
                activeTab={activeTab}
                onSelectMovie={onSelectMovie}
                onRemoveMovie={(id) => {
                  if (activeTab === "watchlist") {
                    toggleWatchlist(id);
                  } else {
                    toggleWatched(id);
                  }
                }}
              />
              ) : (
                <LibraryPlaceholderCard key={id} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Espaço reservado com as mesmas proporções do card, para o filme que ainda não chegou. */
function LibraryPlaceholderCard() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-xl overflow-hidden bg-zinc-900/60 border border-white/5 animate-pulse"
    >
      <div className="aspect-[2/3] w-full bg-zinc-900" />
      <div className="p-2.5 flex flex-col justify-center gap-1.5 h-[58.5px]">
        <div className="h-4 w-3/4 rounded bg-zinc-800" />
        <div className="h-3 w-1/4 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

interface LibraryMovieCardProps {
  movie: Movie;
  activeTab: "watchlist" | "watched";
  onSelectMovie: (movie: Movie) => void;
  onRemoveMovie: (movieId: number) => void;
}

function LibraryMovieCard({
  movie,
  activeTab,
  onSelectMovie,
  onRemoveMovie,
}: LibraryMovieCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, "w342") : "";
  const releaseYear = movie.releaseDate?.slice(0, 4) || "—";
  const removeTitle =
    activeTab === "watchlist"
      ? `Remover "${movie.title}" de Quero Assistir`
      : `Remover "${movie.title}" de Já Assisti`;

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/60 border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5">
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
        className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-label={`Ver detalhes de ${movie.title}`}
      >
        {posterUrl && !imageFailed ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageFailed(true)}
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
          <button
            type="button"
            onClick={() => onSelectMovie(movie)}
            className="text-xs sm:text-sm font-bold text-left text-zinc-200 hover:text-white truncate block w-full cursor-pointer transition-colors focus-visible:outline-none focus-visible:underline"
            title={movie.title}
          >
            {movie.title}
          </button>
          <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
            {releaseYear}
          </span>
        </div>

        {/* Botão de Lixeira discreto com rótulo semântico individual */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveMovie(movie.id);
          }}
          aria-label={removeTitle}
          title={removeTitle}
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}