import { useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Film, ChevronRight, Flame, Sparkles, AlertCircle, RotateCcw } from "lucide-react";
import { useSearchStore } from "./use-search-store";
import { useMovieSearch } from "./use-movie-search";
import { getPosterUrl } from "@/infrastructure/api/movie-service";
import { SEARCH_CONFIG } from "@/infrastructure/search/search-service";
import type { Movie } from "@/domain";
import { GENRES } from "../catalog/constants";

const GENRE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Ação & Aventura": Flame,
  "Ficção & Fantasia": Sparkles,
  "Comédia": Film,
};

interface SearchModalProps {
  onSelectMovie: (movie: Movie) => void;
  onSelectGenre: (genre: string) => void;
}

export function SearchModal({ onSelectMovie, onSelectGenre }: SearchModalProps) {
  const {
    isOpen,
    query,
    selectedIndex,
    closeSearch,
    pauseSearchForDetails,
    setQuery,
    setSelectedIndex,
    moveSelection,
  } = useSearchStore();
  const { results, isLoading, isFetching, isError, hasSearched, debouncedQuery, refetch } =
    useMovieSearch(query);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Guarda o elemento ativo antes de abrir o modal e restaura o foco ao fechar
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      previouslyFocusedRef.current?.focus();
    }
  }, [isOpen]);

  // Trava o scroll da página enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Protege selectedIndex contra encolhimento assíncrono de lista de resultados
  useEffect(() => {
    if (results.length > 0 && selectedIndex >= results.length) {
      setSelectedIndex(0);
    }
  }, [results.length, selectedIndex, setSelectedIndex]);

  // Mantém o item selecionado visível no scroll da lista
  useEffect(() => {
    if (!listRef.current) return;
    const activeItem = listRef.current.querySelector(
      `[data-search-index="${selectedIndex}"]`
    );
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (movie: Movie) => {
      pauseSearchForDetails();
      onSelectMovie(movie);
    },
    [pauseSearchForDetails, onSelectMovie]
  );

  const handleSelectQuickGenre = useCallback(
    (genreName: string) => {
      closeSearch();
      onSelectGenre(genreName);
    },
    [closeSearch, onSelectGenre]
  );

  // Gerenciamento global de acessibilidade do diálogo (Esc fecha, Tab cicla foco)
  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
      return;
    }

    // Focus Trap: impede que o Tab vaze para os elementos fora do modal
    if (e.key === "Tab" && dialogRef.current) {
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  // Navegação na lista de resultados (↑, ↓, Enter) exclusiva do input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection("down", results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection("up", results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetMovie = results[selectedIndex] || results[0];
      if (targetMovie) {
        handleSelect(targetMovie);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisa global do Cinera"
      className="fixed inset-0 z-50 flex items-start justify-center pt-0 md:pt-16 lg:pt-20 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={closeSearch}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleContainerKeyDown}
        className="relative w-full h-full md:h-auto md:max-h-[82vh] md:max-w-2xl bg-zinc-950/95 border-0 md:border md:border-white/10 rounded-none md:rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white cursor-default"
      >
        {/* Cabeçalho de Busca com Input Acessível */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3 bg-zinc-900/60 flex-shrink-0">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={results.length > 0}
            aria-controls="search-results-list"
            aria-activedescendant={results[selectedIndex] ? `search-item-${selectedIndex}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Pesquisar por título de filme ou franquia..."
            aria-label="Campo de pesquisa de filmes"
            autoComplete="off"
            spellCheck="false"
            className="flex-1 bg-transparent text-white placeholder-zinc-500 text-base md:text-lg focus:outline-none font-medium"
          />

          {/* Indicador de carregamento assíncrono */}
          {isFetching && (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin flex-shrink-0" />
          )}

          {/* Botão de limpar texto sempre disponível com texto presente */}
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              title="Limpar texto"
              aria-label="Limpar texto pesquisado"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Atalho Esc no desktop */}
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Fechar janela de busca"
            className="hidden md:inline-flex items-center justify-center text-[11px] font-mono text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Esc
          </button>

          {/* Botão Fechar no mobile */}
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Fechar janela de busca"
            className="md:hidden text-sm font-semibold text-zinc-300 hover:text-white px-1.5 py-1"
          >
            Fechar
          </button>
        </div>

        {/* Área de Conteúdo */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 sm:p-3 scrollbar-hide">
          {/* ESTADO 1: Inicial / Vazio (Sem busca ativa) */}
          {debouncedQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH && (
            <div className="flex flex-col gap-4 py-4 px-2">
              <div className="text-center text-xs uppercase tracking-widest text-zinc-400 font-bold">
                Explorar Catálogos
              </div>

              {/* Sugestões rápidas de Gêneros da fonte única em ordem alfabética */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {GENRES.map((genreName) => (
                  <button
                    key={genreName}
                    type="button"
                    onClick={() => handleSelectQuickGenre(genreName)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{genreName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ESTADO 2: Buscando (Skeleton suave) */}
          {isLoading && (
            <div className="flex flex-col gap-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/40 animate-pulse border border-white/5"
                >
                  <div className="w-11 h-16 rounded-lg bg-zinc-800 flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 w-3/5 bg-zinc-800 rounded" />
                    <div className="h-3 w-1/4 bg-zinc-800/80 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ESTADO 3: Resultados Encontrados */}
          {!isLoading && results.length > 0 && (
            <div
              id="search-results-list"
              role="listbox"
              aria-label="Resultados de filmes encontrados"
              className="flex flex-col gap-1"
            >
              {results.map((movie, index) => {
                const isSelected = selectedIndex === index;
                const posterUrl = movie.posterPath
                  ? getPosterUrl(movie.posterPath, "w342")
                  : "";
                const releaseYear = movie.releaseDate
                  ? new Date(movie.releaseDate).getFullYear()
                  : null;

                return (
                  <div
                    key={movie.id}
                    id={`search-item-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    data-search-index={index}
                    onClick={() => handleSelect(movie)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 select-none active:bg-white/10 ${
                      isSelected
                        ? "md:bg-white/10 text-white md:shadow-sm md:ring-1 md:ring-white/15"
                        : "hover:bg-white/5 text-zinc-200"
                    }`}
                  >
                    {/* Pôster em Miniatura */}
                    <div className="w-11 h-16 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0 relative">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Dados do Filme */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <h4 className="text-sm sm:text-base font-bold text-white truncate leading-snug">
                        {movie.title}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        {releaseYear && <span>{releaseYear}</span>}

                        {movie.genres && movie.genres.length > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-500 inline-block" />
                            <span className="truncate">
                              {movie.genres.slice(0, 2).map((g) => g.name).join(" • ")}
                            </span>
                          </>
                        )}

                        {movie.voteAverage > 0 && (
                          <div className="ml-auto flex items-center rounded overflow-hidden shadow-sm border border-black/20 bg-gradient-to-r from-[#90cea1] to-[#01b4e4] px-1.5 py-0.5 text-[9px] font-black text-[#0d253f] tracking-wider uppercase flex-shrink-0">
                            TMDB: {movie.voteAverage.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={`hidden md:block w-4 h-4 ml-2 flex-shrink-0 transition-opacity ${
                        isSelected ? "opacity-100 text-white" : "opacity-0 group-hover:opacity-60 text-zinc-400"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* ESTADO 4: Erro na Requisição (Tratamento explícito de isError) */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-1">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h4 className="text-base sm:text-lg font-bold text-white">
                Não foi possível buscar filmes no momento
              </h4>

              <p className="text-sm text-zinc-400 max-w-md">
                Verifique sua conexão ou tente novamente em alguns instantes.
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>
          )}

          {/* ESTADO 5: Zero Resultados (Busca sem sucesso, usando debouncedQuery e gêneros dinâmicos) */}
          {!isError && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 mb-1">
                <Film className="w-6 h-6" />
              </div>

              <h4 className="text-base sm:text-lg font-bold text-white">
                Nenhum filme encontrado para "{debouncedQuery}"
              </h4>

              <p className="text-sm text-zinc-400 max-w-md">
                Verifique se o título foi digitado corretamente ou explore uma das categorias em destaque:
              </p>

              {/* Sugestões de gênero derivadas da fonte única GENRES */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {GENRES.slice(0, 3).map((genreName) => {
                  const Icon = GENRE_ICONS[genreName];
                  return (
                    <button
                      key={genreName}
                      type="button"
                      onClick={() => handleSelectQuickGenre(genreName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{genreName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Tátil com Atalhos de Teclado (Desktop) */}
        <div className="hidden md:flex items-center justify-center px-4 py-2.5 border-t border-white/10 bg-zinc-900/60 text-xs text-zinc-400 font-medium flex-shrink-0">
          <div className="flex items-center justify-center gap-5">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">↵</kbd>
              <span>Abrir Filme</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">Esc</kbd>
              <span>Fechar</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
