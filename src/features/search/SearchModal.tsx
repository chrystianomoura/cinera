import { useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Film, ChevronRight, RotateCcw } from "lucide-react";
import { useSearchStore } from "./use-search-store";
import { useMovieSearch } from "./use-movie-search";
import { getPosterUrl } from "@/infrastructure/api/movie-service";
import { SEARCH_CONFIG } from "@/infrastructure/search/search-service";
import { formatCategories, type Movie } from "@/domain";
import { useCategoryIndex } from "@/hooks/use-category-index";
import { resolveCategories } from "@/infrastructure/catalog/category-index";
import { GENRES } from "../catalog/constants";
import { registerSearchInput } from "./open-search";
import { StatusMessage, statusButtonClassName } from "@/features/feedback/StatusMessage";

interface SearchModalProps {
  onSelectMovie: (movie: Movie) => void;
  onSelectGenre: (genre: string) => void;
}

export function SearchModal({ onSelectMovie, onSelectGenre }: SearchModalProps) {
  const { data: categoryIndex } = useCategoryIndex();
  const {
    isOpen,
    query,
    selectedIndex,
    scrollPosition,
    isPausedForDetails,
    closeSearch,
    pauseSearchForDetails,
    setQuery,
    setSelectedIndex,
    moveSelection,
  } = useSearchStore();
  const { results, isLoading, isFetching, isError, hasSearched, debouncedQuery, isSettled, refetch } =
    useMovieSearch(query, !isPausedForDetails);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Ao abrir o modal, foca no campo de busca com leve delay. Ao fechar, limpa o foco para não deixar anel residual na lupa.
  useEffect(() => {
    if (isOpen && !isPausedForDetails) {
      previouslyFocusedRef.current ??= document.activeElement as HTMLElement | null;
      // Em dispositivos de toque o foco vem do próprio toque (openSearchAndFocus); forçar o foco aqui
      // faria o teclado cobrir os resultados ao voltar dos detalhes.
      if (window.matchMedia("(pointer: coarse)").matches) return;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }

    if (!isOpen && !isPausedForDetails) {
      // Padrão Linear/Apple: remove o foco forçado para manter a interface limpa e cinematográfica
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      previouslyFocusedRef.current = null;
    }
  }, [isOpen, isPausedForDetails]);

  // Listener global no document para fechar no Escape, conter o Tab no diálogo e travar o scroll
  useEffect(() => {
    if (!isOpen || isPausedForDetails) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const allFocusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        // Filtra elementos que estão ocultos por display: none (ex: md:hidden no desktop)
        const focusables = allFocusables.filter((el) => el.offsetParent !== null);

        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, isPausedForDetails, closeSearch]);

  // Protege selectedIndex contra encolhimento assíncrono de lista de resultados
  useEffect(() => {
    if (results.length > 0 && selectedIndex >= results.length) {
      setSelectedIndex(-1);
    }
  }, [results.length, selectedIndex, setSelectedIndex]);

  // Restaura a posição exata de rolagem da lista quando o usuário retorna dos detalhes, ou reseta para o topo em nova busca
  useEffect(() => {
    if (!isOpen || !listRef.current || results.length === 0) return;
    if (scrollPosition > 0) {
      // Restaura exatamente a coordenada de scroll onde o usuário estava ao pausar para ver o filme
      listRef.current.scrollTop = scrollPosition;
    } else {
      // Nova busca ou início: começa sempre no topo absoluto
      listRef.current.scrollTop = 0;
    }
  }, [isOpen, results.length, scrollPosition, debouncedQuery]);

  // Mantém o item visível apenas quando o usuário navega pelo teclado (ArrowUp / ArrowDown)
  const handleSelect = useCallback(
    (movie: Movie) => {
      // Salva a coordenada exata de rolagem do container antes de abrir os detalhes
      const currentScroll = listRef.current ? listRef.current.scrollTop : 0;
      pauseSearchForDetails(currentScroll);
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

  // Navegação na lista de resultados (↑, ↓, Enter) exclusiva do input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = selectedIndex < 0 ? 0 : (selectedIndex + 1) % results.length;
      moveSelection("down", results.length);
      requestAnimationFrame(() => {
        listRef.current?.querySelector(`[data-search-index="${nextIdx}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = selectedIndex < 0 ? results.length - 1 : (selectedIndex - 1 + results.length) % results.length;
      moveSelection("up", results.length);
      requestAnimationFrame(() => {
        listRef.current?.querySelector(`[data-search-index="${prevIdx}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Bloqueia abertura prematura enquanto a digitação ou fetch de novos resultados estiver em trânsito
      if (!isSettled) return;

      const targetMovie = results[selectedIndex] || results[0];
      if (targetMovie) {
        handleSelect(targetMovie);
      }
    }
  };

  if (!isOpen) return null;

  const showList = !isLoading && results.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisa global do Cinera"
      className="fixed inset-0 z-50 flex items-start justify-center pt-0 md:pt-16 lg:pt-20 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeSearch();
        }
      }}
    >
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full md:h-auto md:max-h-[82vh] md:max-w-2xl bg-zinc-950/95 border-0 md:border md:border-white/10 rounded-none md:rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white cursor-default"
      >
        {/* Cabeçalho de Busca com Input Acessível e Suporte a Safe-Area no Mobile */}
        <div className="flex items-center px-3.5 sm:px-4 pt-3 pb-3 sm:py-3.5 border-b border-white/10 gap-2.5 sm:gap-3 bg-zinc-900/80 backdrop-blur-md flex-shrink-0">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />

          <input
            ref={(node) => {
              inputRef.current = node;
              registerSearchInput(node);
            }}
            type="text"
            enterKeyHint="search"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={showList}
            aria-controls={showList ? "search-results-list" : undefined}
            aria-activedescendant={showList && results[selectedIndex] ? `search-item-${selectedIndex}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Pesquisar por filme ou franquia..."
            aria-label="Campo de pesquisa de filmes"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            className="flex-1 bg-transparent text-white placeholder-zinc-500 text-base sm:text-lg focus:outline-none font-medium"
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
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer flex-shrink-0 rounded-full hover:bg-white/5 active:bg-white/10"
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
            className="hidden md:inline-flex items-center justify-center text-xs font-mono font-medium text-zinc-300 bg-white/10 hover:bg-white/15 border border-white/15 px-2.5 py-1 rounded-md cursor-pointer transition-colors shadow-sm"
          >
            Esc
          </button>

          {/* Botão Fechar no mobile com área de toque ergonômica */}
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Fechar janela de busca"
            className="md:hidden text-sm font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded-lg active:bg-white/10 transition-colors"
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
              aria-busy={!isSettled}
              onMouseLeave={() => setSelectedIndex(-1)}
              className="flex flex-col gap-1"
            >
              {results.map((movie, index) => {
                const isSelected = selectedIndex === index;
                const posterUrl = movie.posterPath
                  ? getPosterUrl(movie.posterPath, "w342")
                  : "";
                const releaseYear = movie.releaseDate
                  ? movie.releaseDate.slice(0, 4)
                  : null;
                // Só categorias que existem no Cinera (as mesmas da ficha), nunca gêneros soltos do TMDB
                const categoryLabel = formatCategories(resolveCategories(movie, categoryIndex));

                return (
                  <div
                    key={movie.id}
                    id={`search-item-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    data-search-index={index}
                    onClick={() => handleSelect(movie)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-center gap-4 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-150 select-none active:bg-white/10 border-b border-white/[0.06] last:border-b-0 ${
                      isSelected
                        ? "bg-white/[0.08] text-white shadow-sm ring-1 ring-white/15"
                        : "hover:bg-white/[0.04] text-zinc-200"
                    }`}
                  >
                    {/* Pôster Imponente e Cinematográfico (w-16 h-24 / 64px x 96px) */}
                    <div className="w-16 h-24 sm:w-16 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-white/15 flex-shrink-0 relative shadow-[0_8px_20px_rgba(0,0,0,0.7)]">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
                          <Film className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Dados do Filme: Título Grande e Forte com Categorias Separadas por '/' */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-0.5">
                      <h4 className="text-base sm:text-lg font-bold text-white truncate leading-tight tracking-tight">
                        {movie.title}
                      </h4>

                      <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-zinc-400 font-normal">
                        {releaseYear && (
                          <span className="text-zinc-300 font-semibold">{releaseYear}</span>
                        )}

                        {categoryLabel && (
                          <>
                            {/* Ponto Divisor com Contraste Marcante */}
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block flex-shrink-0" />
                            <span className="truncate text-zinc-300">{categoryLabel}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chevron Convidativo e Evidente no Mobile e Desktop */}
                    <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-active:text-white transition-colors flex-shrink-0 ml-1 stroke-[2.25]" />
                  </div>
                );
              })}
            </div>
          )}

          {/* ESTADO 4: Erro na Requisição (Tratamento explícito de isError) */}
          {isError && (
            <StatusMessage
              emoji="🤯"
              title="Não foi possível buscar filmes"
              description="Verifique sua conexão ou tente novamente em alguns instantes."
              size="compact"
            >
              <button type="button" onClick={() => refetch()} className={statusButtonClassName}>
                <RotateCcw size={14} />
                <span>Tentar novamente</span>
              </button>
            </StatusMessage>
          )}

          {/* ESTADO 5: Zero Resultados (Busca sem sucesso, compacto e limpo) */}
          {!isError && hasSearched && results.length === 0 && (
            <StatusMessage
              emoji="😔"
              title={`Nenhum filme encontrado para "${debouncedQuery.length > 35 ? `${debouncedQuery.slice(0, 35)}...` : debouncedQuery}"`}
              description="Verifique se o título foi digitado corretamente ou explore uma das categorias em destaque:"
              size="compact"
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-lg">
                {GENRES.map((genreName) => (
                  <button
                    key={genreName}
                    type="button"
                    onClick={() => handleSelectQuickGenre(genreName)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 hover:border-white/25 text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <span>{genreName}</span>
                  </button>
                ))}
              </div>
            </StatusMessage>
          )}
        </div>

        {/* Rodapé Tátil com Atalhos de Teclado (Desktop) */}
        <div className="hidden md:flex items-center justify-center px-4 py-3 border-t border-white/10 bg-zinc-900/80 text-[13px] text-zinc-300 font-medium flex-shrink-0">
          <div className="flex items-center justify-center gap-6">
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-xs border border-white/10 shadow-sm">↑</kbd>
              <kbd className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-xs border border-white/10 shadow-sm">↓</kbd>
              <span className="text-zinc-300">Navegar</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-xs border border-white/10 shadow-sm">↵</kbd>
              <span className="text-zinc-300">Abrir Filme</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-xs border border-white/10 shadow-sm">Esc</kbd>
              <span className="text-zinc-300">Fechar</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
