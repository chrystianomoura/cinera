import { useState, useEffect } from "react";
import { X, Play, Bookmark, Film, Loader2, ArrowLeft } from "lucide-react";
import type { Movie } from "@/domain";
import { getPosterUrl, getBackdropUrl } from "@/infrastructure/api/movie-service";
import { formatRuntime, formatCurrencyUSD } from "@/lib/formatters";
import { formatCategories } from "@/domain";
import { useCategoryIndex } from "@/hooks/use-category-index";
import { resolveCategories } from "@/infrastructure/catalog/category-index";
import { useMovieFullDetails } from "@/hooks/use-movie-full-details";
import { useUserLibrary } from "@/stores/use-user-library";
import { CertificationBadge } from "./CertificationBadge";
import { resolveCertification } from "./certification";
import { WatchProvidersRow } from "./WatchProvidersRow";
import { CastCarousel } from "./CastCarousel";
import { GalleryCarousel } from "./GalleryCarousel";
import { PhotoModal } from "./PhotoModal";
import { WatchedStatusIcon } from "./WatchedStatusIcon";
import { lockPageScroll } from "@/lib/page-scroll";
import { getDisplayCast } from "@/domain/credits";

interface MovieDetailsViewProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTrailer: (movie: Movie) => void;
  isFromSearch?: boolean;
  isFromLibrary?: boolean;
}

export function MovieDetailsView({
  movie: initialMovie,
  isOpen,
  onClose,
  onOpenTrailer,
  isFromSearch = false,
  isFromLibrary = false,
}: MovieDetailsViewProps) {
  const movieId = initialMovie?.id ?? null;
  const {
    movie: detailedMovie,
    isLoadingMovie,
    credits,
    isLoadingCredits,
    providers,
    isLoadingProviders,
    isErrorProviders,
    certification,
    imdbRating,
    isLoadingImdbRating,
    gallery,
    isLoadingGallery,
  } = useMovieFullDetails(movieId);

  const movie = detailedMovie || initialMovie;
  const { data: categoryIndex } = useCategoryIndex();

  const { watchlist, watched, toggleWatchlist, toggleWatched } = useUserLibrary();
  const isWatchlist = movieId ? watchlist.includes(movieId) : false;
  const isWatched = movieId ? watched.includes(movieId) : false;

  // Estado para o modal de foto ampliada da galeria
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // O trailer é o passo seguinte mais provável: abre a conexão com o YouTube agora, e não só no clique
  useEffect(() => {
    if (!isOpen || document.querySelector('link[rel="preconnect"][href="https://www.youtube-nocookie.com"]')) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://www.youtube-nocookie.com";
    document.head.appendChild(link);
  }, [isOpen]);

  // Tecla ESC para fechar e trava do scroll do body
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPhotoIndex === null) {
        onClose();
      }
    };

    const unlockScroll = lockPageScroll();

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlockScroll();
    };
  }, [isOpen, onClose, selectedPhotoIndex]);

  if (!isOpen || !movie) return null;

  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, "w500") : null;
  const backdropUrl = movie.backdropPath ? getBackdropUrl(movie.backdropPath, "w1280") : null;
  const releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
  // Há selo de verdade? Códigos que o selo não reconhece (ex.: "NR") contam como sem selo, para não sobrar um ponto solto
  const hasCertification = resolveCertification(certification) !== null;
  const duration = formatRuntime(movie.runtime);
  // Categorias do Cinera: as mesmas da pesquisa e das listas (catálogo, ou classificação por tags do TMDB)
  const curatedGenres = formatCategories(resolveCategories({ ...movie, categories: initialMovie?.categories ?? movie.categories }, categoryIndex));

  const originalTitle = movie.originalTitle;
  const formattedBudget = formatCurrencyUSD(movie.budget);
  const formattedRevenue = formatCurrencyUSD(movie.revenue);
  const hasFinancialContrast = Boolean(formattedBudget && formattedRevenue);

  const companies = movie.productionCompanies?.map((c) => c.name).filter(Boolean);
  const companiesList =
    companies && companies.length > 0 ? companies.slice(0, 3).join(", ") : null;

  const hasDirectors = Boolean(credits?.directors && credits.directors.length > 0);
  const hasProductionDetails = Boolean(
    hasDirectors || originalTitle || formattedBudget || formattedRevenue || companiesList
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do filme ${movie.title}`}
      className="fixed inset-0 z-[80] overflow-y-auto bg-black scrollbar-hide wide:animate-in wide:fade-in wide:duration-300"
    >
      {/* Backdrop */}
      {backdropUrl ? (
        <div className="absolute top-0 inset-x-0 h-[calc(var(--app-vh,100vh)*0.65)] wide:h-[75vh] overflow-hidden pointer-events-none z-0">
          <img
            src={backdropUrl}
            srcSet={`${getBackdropUrl(movie.backdropPath, "w780")} 780w, ${backdropUrl} 1280w`}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="w-full h-full object-cover object-top opacity-35 wide:contrast-125"
          />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
          <div
            className="absolute inset-x-0 bottom-0 h-3/4 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.3) 70%, transparent 100%)",
            }}
          />
        </div>
      ) : null}

      <div className="sticky top-0 inset-x-0 z-40 px-4 wide:px-12 header-bar flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-black/60">
        <h1 className="tracking-widest font-black text-2xl sm:text-3xl wide:text-[2.65rem] leading-none text-white uppercase font-serif flex-shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          Cinera
        </h1>

        <button
          onClick={onClose}
          aria-label={
            isFromSearch
              ? "Voltar para a pesquisa (Esc)"
              : isFromLibrary
              ? "Voltar para a biblioteca (Esc)"
              : "Fechar detalhes (Esc)"
          }
          title={
            isFromSearch
              ? "Voltar para a pesquisa (Esc)"
              : isFromLibrary
              ? "Voltar para a biblioteca (Esc)"
              : "Fechar (Esc)"
          }
          className="flex items-center gap-2 px-4 h-9 sm:h-10 rounded-full bg-zinc-800/80 hover:bg-white text-zinc-300 hover:text-black border border-white/20 transition-all duration-200 cursor-pointer shadow-lg group"
        >
          {isFromSearch ? (
            <>
              <ArrowLeft className="w-4 h-4 stroke-[2.5] transition-transform group-hover:-translate-x-0.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Pesquisa
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
                Voltar
              </span>
              <X className="w-4 h-4 stroke-[2.5] transition-transform group-hover:rotate-90" />
            </>
          )}
        </button>
      </div>

      {/* 4. CONTEÚDO PRINCIPAL (HERO + METADADOS + FICHA). No celular deitado (tela larga e baixa) o layout é o de duas colunas (variante
          wide, ver index.css) e o ajuste compacto (variante paisagem) leva cartaz, título, categorias, nota, botões e "Onde assistir"
          para a primeira tela */}
      <div className="relative z-10 max-w-6xl mx-auto px-0 wide:px-12 pt-6 wide:pt-8 pb-page-end flex flex-col gap-6 wide:gap-8 paisagem:px-7 paisagem:pt-2.5 paisagem:gap-3.5">
        {/* Bloco superior: cartaz e informações de capa */}
        <section className="flex flex-col wide:flex-row gap-8 lg:gap-12 paisagem:gap-5 items-center wide:items-start px-4 wide:px-0">
          {/* Cartaz com borda em vidro */}
          <div className="relative w-52 sm:w-64 md:w-72 lg:w-80 paisagem:w-[132px] flex-shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.9)] [transform:translateZ(0)]">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`Cartaz do filme ${movie.title}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Film className="w-12 h-12 mb-2 text-zinc-600" />
                <span className="text-xs uppercase tracking-widest font-mono">Sem Cartaz</span>
              </div>
            )}
          </div>

          {/* Dados Textuais e Ações alinhados milimetricamente no topo com a margem superior do cartaz */}
          {/* not-wide:self-stretch: no celular o contêiner centraliza os filhos (items-center), então sem isso a coluna encolhia até a largura do
                texto mais largo e as linhas e botões ficavam mais curtos nos filmes de título e sinopse curtos */}
            <div className="flex flex-col gap-4 paisagem:gap-2 flex-1 min-w-0 not-wide:self-stretch text-center wide:text-left wide:-mt-1.5 paisagem:-mt-[3px]">
            {/* Bloco de Cabeçalho: Título e Tagline com espaçamento íntimo */}
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {/* Título principal, com quebra de linha nos dois pontos (:) */}
              {(() => {
                const colonIndex = movie.title.indexOf(":");
                if (colonIndex !== -1) {
                  const part1 = movie.title.slice(0, colonIndex).trim();
                  const part2 = movie.title.slice(colonIndex + 1).trim();

                  return (
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl paisagem:text-[28px] font-black text-white tracking-tight leading-[1.05] drop-shadow-lg [text-wrap:balance]">
                      <span>{part1}:</span>
                      {part2 && (
                        <span className="block mt-1 text-white/95">{part2}</span>
                      )}
                    </h2>
                  );
                }

                return (
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl paisagem:text-[28px] font-black text-white tracking-tight leading-[0.98] drop-shadow-lg [text-wrap:balance]">
                    {movie.title}
                  </h2>
                );
              })()}

              {/* Tagline Oficial colada ao título */}
              {movie.tagline ? (
                <p className="text-base sm:text-lg wide:text-xl paisagem:text-sm font-medium italic text-zinc-100 drop-shadow leading-snug [text-wrap:balance]">
                  {movie.tagline.replace(/^["'“”«»]+|["'“”«»]+$/g, "").trim()}
                </p>
              ) : null}
            </div>

            {/* Linha de Metadados: Emoldurada no mobile, limpa sem linha no desktop */}
            <div className="flex flex-col wide:flex-row wide:flex-wrap items-center justify-center wide:justify-start gap-2.5 sm:gap-3 text-sm sm:text-base wide:text-base pt-3 pb-[18px] sm:pt-3.5 sm:pb-5 wide:py-0 border-y wide:border-y-0 border-white/25 wide:border-white/10 w-full">
              {/* Linha 1 no mobile: Ano e Duração */}
              {(releaseYear || duration) && (
                <div className="flex items-center gap-2.5">
                  {releaseYear && (
                    <span className="font-semibold text-zinc-100">{releaseYear}</span>
                  )}
                  {releaseYear && duration && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)] inline-block" />
                  )}
                  {duration && (
                    <span className="font-semibold text-zinc-100">{duration}</span>
                  )}
                </div>
              )}

              {/* Separador no desktop entre Linha 1 e Linha 2 */}
              {(releaseYear || duration) && curatedGenres && (
                <span className="hidden wide:inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
              )}

              {/* Linha 2 no mobile: Categorias */}
              {curatedGenres && (
                <div className="text-zinc-100 font-semibold text-center wide:text-left">
                  {curatedGenres}
                </div>
              )}

              {/* Separador no desktop entre Linha 2 e Linha 3 */}
              {curatedGenres && (hasCertification || imdbRating || isLoadingImdbRating) && (
                <span className="hidden wide:inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
              )}

              {/* Linha 3 no mobile: Classificação Indicativa e IMDb */}
              {(hasCertification || imdbRating || isLoadingImdbRating) && (
                <div className="flex items-center gap-2.5">
                  {hasCertification && (
                    <CertificationBadge certification={certification} />
                  )}

                  {hasCertification && (imdbRating || isLoadingImdbRating) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)] inline-block" />
                  )}

                  {/* Badge Oficial Dourada do IMDb */}
                  {isLoadingImdbRating && (
                    <div className="h-6 w-20 rounded bg-zinc-800 animate-pulse border border-white/10" />
                  )}

                  {!isLoadingImdbRating && imdbRating && (
                    <div
                      title={imdbRating.votes ? `${imdbRating.votes} votos no IMDb` : "Nota IMDb"}
                      className="inline-flex items-center h-6 rounded px-2.5 text-sm leading-none font-black tracking-wide bg-[#f5c518] text-black shadow-sm select-none cursor-default hover:brightness-105 transition-all"
                    >
                      <span>IMDb: {imdbRating.rating}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botões de Ação Principais: Linha divisória no desktop acima do trailer. wide:flex-wrap: entre 768 e ~900px (celular deitado, iPad em
                pé) os três botões não cabem numa linha só ao lado do cartaz; sem quebrar, a ficha ganhava rolagem lateral */}
            <div className="flex flex-col wide:flex-row wide:flex-wrap items-center wide:justify-start gap-3 sm:gap-4 w-full wide:border-t wide:border-white/10 wide:pt-4">
              {/* 1. Trailer */}
              <button
                type="button"
                onClick={() => onOpenTrailer(movie)}
                className="w-full wide:w-auto flex items-center justify-center gap-2.5 px-6 py-3 paisagem:px-3.5 paisagem:py-2 paisagem:text-[13px] rounded-full bg-white text-black font-bold text-sm sm:text-base hover:bg-zinc-200 transition-all duration-200 shadow-xl hover:scale-105 active:scale-95 cursor-pointer group"
              >
                <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                <span>Trailer</span>
              </button>

              {/* Ações de Biblioteca Pessoal: Grid de 2 colunas no mobile, linha flex no desktop */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full wide:flex wide:w-auto wide:gap-4">
                {/* 2. Quero Assistir (Watchlist com toggle exclusivo e paleta Cinera) */}
                <button
                  type="button"
                  onClick={() => toggleWatchlist(movie.id, movie)}
                  aria-pressed={isWatchlist}
                  className={`w-full wide:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 paisagem:px-3.5 paisagem:py-2 paisagem:text-[13px] rounded-full text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95 ${
                    isWatchlist
                      ? "bg-white text-black border border-white shadow-[0_4px_20px_rgba(255,255,255,0.25)]"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/20 hover:border-white/40 wide:backdrop-blur-md"
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 flex-shrink-0 ${
                      isWatchlist ? "fill-current stroke-current" : "stroke-[2.2]"
                    }`}
                  />
                  <span className="truncate">Quero Assistir</span>
                </button>

                {/* 3. Já Assisti (Watched History com toggle exclusivo e paleta Cinera) */}
                <button
                  type="button"
                  onClick={() => toggleWatched(movie.id, movie)}
                  aria-pressed={isWatched}
                  className={`w-full wide:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 paisagem:px-3.5 paisagem:py-2 paisagem:text-[13px] rounded-full text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95 ${
                    isWatched
                      ? "bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/60 hover:border-emerald-400 wide:backdrop-blur-md"
                      : "bg-rose-400/10 hover:bg-rose-400/20 text-rose-400 border border-rose-400/60 hover:border-rose-400 wide:backdrop-blur-md"
                  }`}
                >
                  <WatchedStatusIcon watched={isWatched} />
                  <span className="truncate">Já Assisti</span>
                </button>
              </div>
            </div>

            {/* Onde Assistir (Watch Providers Brasil com título visível em destaque) */}
            <WatchProvidersRow
              providers={providers}
              isLoading={isLoadingProviders}
              isError={isErrorProviders}
            />

            {/* Ficha de Produção & Finanças (com Direção no topo) */}
            {hasProductionDetails && (
              <div className="flex flex-col gap-2 wide:gap-2.5 pt-3 border-t border-white/25 wide:border-white/10 text-center wide:text-left w-full">
                {/* Linha 1: Direção */}
                {hasDirectors && (
                  <div className="text-center wide:text-left">
                    <span className="text-zinc-400 font-bold uppercase text-[13px] sm:text-sm wide:text-xs tracking-wider mr-1.5">
                      Direção:
                    </span>
                    <span className="font-medium text-zinc-100 text-base sm:text-lg wide:text-sm">
                      {credits!.directors!.join(", ")}
                    </span>
                  </div>
                )}

                {/* Linha 2: Orçamento e Bilheteria SEMPRE juntos e primeiro, com cores semânticas apenas quando ambos existem */}
                {(formattedBudget || formattedRevenue) && (
                  <div className="flex flex-col wide:flex-row wide:flex-wrap items-center wide:justify-start gap-y-1 wide:gap-x-6">
                    {formattedBudget && (
                      <div className="flex items-center whitespace-nowrap">
                        <span className="text-zinc-400 font-bold uppercase text-[13px] sm:text-sm wide:text-xs tracking-wider mr-1.5">
                          Orçamento:
                        </span>
                        <span
                          className={`font-medium text-base sm:text-lg wide:text-sm ${
                            hasFinancialContrast ? "text-rose-400" : "text-zinc-100"
                          }`}
                        >
                          {formattedBudget}
                        </span>
                      </div>
                    )}

                    {formattedRevenue && (
                      <div className="flex items-center whitespace-nowrap">
                        <span className="text-zinc-400 font-bold uppercase text-[13px] sm:text-sm wide:text-xs tracking-wider mr-1.5">
                          Bilheteria:
                        </span>
                        <span
                          className={`font-medium text-base sm:text-lg wide:text-sm ${
                            hasFinancialContrast ? "text-emerald-400" : "text-zinc-100"
                          }`}
                        >
                          {formattedRevenue}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Linha 3: Título Original */}
                {originalTitle && (
                  <div className="text-center wide:text-left">
                    <span className="text-zinc-400 font-bold uppercase text-[13px] sm:text-sm wide:text-xs tracking-wider mr-1.5">
                      Título Original:
                    </span>
                    <span className="font-medium text-zinc-100 text-base sm:text-lg wide:text-sm">
                      {originalTitle}
                    </span>
                  </div>
                )}

                {/* Linha 4: Produtoras com fluxo contínuo e quebra natural */}
                {companiesList && (
                  <div className="text-center wide:text-left">
                    <span className="text-zinc-400 font-bold uppercase text-[13px] sm:text-sm wide:text-xs tracking-wider mr-1.5">
                      Produtoras:
                    </span>
                    <span className="font-medium text-zinc-100 text-base sm:text-lg wide:text-sm">
                      {companiesList}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Sinopse com linha divisória e espaçamento unificado. No celular a linha das três seções (sinopse, elenco, galeria) é um traço
            próprio com 16px de margem, como as demais linhas da ficha, e não a borda da seção: ela vai de ponta a ponta porque os
            carrosséis do elenco e da galeria sangram até a borda da tela */}
        {movie.overview ? (
          <section className="relative w-full wide:border-t wide:border-white/10 pt-6 wide:pt-8 not-wide:before:absolute not-wide:before:inset-x-4 not-wide:before:top-0 not-wide:before:h-px not-wide:before:bg-white/25">
            <div className="max-w-2xl sm:max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-3">
              <h3 className="text-sm sm:text-[15px] wide:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center w-full">
                Sinopse
              </h3>
              <p className="text-base sm:text-lg wide:text-xl text-white leading-relaxed font-normal text-left">
                {movie.overview}
              </p>
            </div>
          </section>
        ) : null}

        {/* Elenco Principal com linha divisória e espaçamento unificado */}
        {(isLoadingCredits || getDisplayCast(credits?.cast).length > 0) ? (
          <section className="relative w-full wide:border-t wide:border-white/10 pt-6 wide:pt-8 not-wide:before:absolute not-wide:before:inset-x-4 not-wide:before:top-0 not-wide:before:h-px not-wide:before:bg-white/25">
            <CastCarousel cast={credits?.cast} isLoading={isLoadingCredits} />
          </section>
        ) : null}

        {/* Galeria de Fotos com linha divisória e espaçamento unificado */}
        {(isLoadingGallery || (gallery && gallery.length > 0)) ? (
          <section className="relative w-full wide:border-t wide:border-white/10 pt-6 wide:pt-8 not-wide:before:absolute not-wide:before:inset-x-4 not-wide:before:top-0 not-wide:before:h-px not-wide:before:bg-white/25">
            <GalleryCarousel
              images={gallery}
              isLoading={isLoadingGallery}
              onSelectImage={(index) => setSelectedPhotoIndex(index)}
            />
          </section>
        ) : null}

        {isLoadingMovie && (
          <div className="flex items-center justify-center py-8 gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-white/70" />
            <span className="text-sm font-medium">Atualizando ficha técnica...</span>
          </div>
        )}
      </div>

      {/* 7. MODAL DE FOTO AMPLIADA DA GALERIA EM ALTA RESOLUÇÃO */}
      <PhotoModal
        isOpen={selectedPhotoIndex !== null}
        images={gallery}
        currentIndex={selectedPhotoIndex ?? 0}
        movieTitle={movie.title}
        onClose={() => setSelectedPhotoIndex(null)}
        onSelectIndex={(index) => setSelectedPhotoIndex(index)}
      />
    </div>
  );
}
