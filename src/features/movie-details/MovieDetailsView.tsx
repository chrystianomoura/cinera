import { useState, useEffect } from "react";
import { X, Play, Bookmark, Check, Film, Loader2 } from "lucide-react";
import type { Movie } from "@/domain";
import { getPosterUrl, getBackdropUrl } from "@/infrastructure/api/movie-service";
import { formatRuntime, formatCurrencyUSD, formatCuratedGenres } from "@/lib/formatters";
import { extractDominantColor } from "@/lib/color-extractor";
import { useMovieFullDetails } from "@/hooks/use-movie-full-details";
import { useUserLibrary } from "@/stores/use-user-library";
import { CertificationBadge } from "./CertificationBadge";
import { WatchProvidersRow } from "./WatchProvidersRow";
import { CastCarousel } from "./CastCarousel";
import { GalleryCarousel } from "./GalleryCarousel";
import { PhotoModal } from "./PhotoModal";

interface MovieDetailsViewProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTrailer: (movie: Movie) => void;
}

export function MovieDetailsView({
  movie: initialMovie,
  isOpen,
  onClose,
  onOpenTrailer,
}: MovieDetailsViewProps) {
  const movieId = initialMovie?.id ?? null;
  const {
    movie: detailedMovie,
    isLoadingMovie,
    credits,
    isLoadingCredits,
    providers,
    isLoadingProviders,
    certification,
    gallery,
    isLoadingGallery,
  } = useMovieFullDetails(movieId);

  const movie = detailedMovie || initialMovie;

  const { watchlist, watched, toggleWatchlist, toggleWatched } = useUserLibrary();
  const isWatchlist = movieId ? watchlist.includes(movieId) : false;
  const isWatched = movieId ? watched.includes(movieId) : false;

  // Estado para o modal de foto ampliada da galeria
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Cor cromática dinâmica baseada no pôster
  const [ambientColor, setAmbientColor] = useState<string>("30, 41, 59");

  const posterPath = movie?.posterPath;
  useEffect(() => {
    if (!posterPath) return;
    const imgUrl = getPosterUrl(posterPath, "w342");
    extractDominantColor(imgUrl).then((color) => {
      setAmbientColor(color.rgbString);
    });
  }, [posterPath]);

  // Tecla ESC para fechar e trava do scroll do body
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPhotoIndex === null) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, selectedPhotoIndex]);

  if (!isOpen || !movie) return null;

  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, "w500") : null;
  const backdropUrl = movie.backdropPath ? getBackdropUrl(movie.backdropPath, "w1280") : null;
  const releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
  const duration = formatRuntime(movie.runtime);
  const curatedGenres = formatCuratedGenres(movie.genres);

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
      className="fixed inset-0 z-50 overflow-y-auto bg-black scrollbar-hide animate-in fade-in duration-300"
    >
      {/* Atmosfera cromática de fundo */}
      <div
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-out z-0"
        style={{
          background: `radial-gradient(ellipse 95% 70% at 50% -10%, rgba(${ambientColor}, 0.52) 0%, rgba(${ambientColor}, 0.18) 45%, #000000 80%)`,
        }}
      />

      {/* Backdrop */}
      {backdropUrl ? (
        <div className="absolute top-0 inset-x-0 h-[65vh] md:h-[75vh] overflow-hidden pointer-events-none z-0">
          <img
            src={backdropUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-top opacity-35 filter contrast-125"
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

      <header className="sticky top-0 inset-x-0 z-40 px-4 md:px-12 py-3.5 md:py-4 flex items-center justify-between backdrop-blur-md bg-black/40 border-b border-white/10">
        <h1 className="tracking-widest font-black text-2xl sm:text-3xl text-white uppercase font-serif select-none drop-shadow-md">
          Cinera
        </h1>

        <button
          onClick={onClose}
          aria-label="Fechar detalhes (Esc)"
          title="Fechar (Esc)"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 hover:bg-white text-zinc-300 hover:text-black border border-white/20 transition-all duration-200 cursor-pointer shadow-lg group"
        >
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
            Voltar
          </span>
          <X className="w-4 h-4 stroke-[2.5] transition-transform group-hover:rotate-90" />
        </button>
      </header>

      {/* 4. CONTEÚDO PRINCIPAL (HERO + METADADOS + FICHA) */}
      <main className="relative z-10 max-w-6xl mx-auto px-0 md:px-12 pt-6 md:pt-8 pb-24 flex flex-col gap-6 md:gap-8">
        {/* Bloco Superior: Cartaz Flutuante + Informações de Capa perfeitamente alinhados no topo */}
        <section className="flex flex-col md:flex-row gap-8 lg:gap-12 items-center md:items-start px-4 md:px-0">
          {/* Cartaz com borda em vidro */}
          <div className="relative w-52 sm:w-64 md:w-72 lg:w-80 flex-shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.9)] [transform:translateZ(0)]">
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
          <div className="flex flex-col gap-4 flex-1 text-center md:text-left md:-mt-1.5">
            {/* Bloco de Cabeçalho: Título e Tagline com espaçamento íntimo */}
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {/* Título Principal com regra de quebra cinematográfica nos dois pontos (:) */}
              {(() => {
                const colonIndex = movie.title.indexOf(":");
                if (colonIndex !== -1) {
                  const part1 = movie.title.slice(0, colonIndex).trim();
                  const part2 = movie.title.slice(colonIndex + 1).trim();

                  return (
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] drop-shadow-lg [text-wrap:balance]">
                      <span>{part1}:</span>
                      {part2 && (
                        <span className="block mt-1 text-white/95">{part2}</span>
                      )}
                    </h2>
                  );
                }

                return (
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[0.98] drop-shadow-lg [text-wrap:balance]">
                    {movie.title}
                  </h2>
                );
              })()}

              {/* Tagline Oficial colada ao título */}
              {movie.tagline ? (
                <p className="text-base sm:text-lg md:text-xl font-medium italic text-zinc-300 drop-shadow leading-snug [text-wrap:balance]">
                  "{movie.tagline.replace(/^["'“”«»]+|["'“”«»]+$/g, "").trim()}"
                </p>
              ) : null}
            </div>

            {/* Linha de Metadados: Emoldurada no mobile, limpa sem linha no desktop */}
            <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-sm sm:text-base md:text-base py-3 sm:py-3.5 md:py-0 border-y md:border-y-0 border-white/10 w-full">
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
                <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
              )}

              {/* Linha 2 no mobile: Categorias */}
              {curatedGenres && (
                <div className="text-zinc-200 font-medium text-center md:text-left">
                  {curatedGenres}
                </div>
              )}

              {/* Separador no desktop entre Linha 2 e Linha 3 */}
              {curatedGenres && (certification || movie.voteAverage > 0) && (
                <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
              )}

              {/* Linha 3 no mobile: Classificação Indicativa e TMDB */}
              {(certification || movie.voteAverage > 0) && (
                <div className="flex items-center gap-2.5">
                  {certification && (
                    <CertificationBadge certification={certification} />
                  )}

                  {certification && movie.voteAverage > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)] inline-block" />
                  )}

                  {movie.voteAverage > 0 && (
                    <div className="flex items-center rounded overflow-hidden shadow-sm border border-black/30 bg-gradient-to-r from-[#90cea1] to-[#01b4e4] px-2 py-0.5 text-xs font-black text-[#0d253f] tracking-wider uppercase">
                      TMDB: {movie.voteAverage.toFixed(1)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botões de Ação Principais: Linha divisória no desktop acima do trailer */}
            <div className="flex flex-col md:flex-row items-center md:justify-start gap-3 sm:gap-4 w-full md:border-t md:border-white/10 md:pt-4">
              {/* 1. Trailer */}
              <button
                type="button"
                onClick={() => onOpenTrailer(movie)}
                className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-bold text-sm sm:text-base hover:bg-zinc-200 transition-all duration-200 shadow-xl hover:scale-105 active:scale-95 cursor-pointer group"
              >
                <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                <span>Trailer</span>
              </button>

              {/* Ações de Biblioteca Pessoal: Grid de 2 colunas no mobile, linha flex no desktop */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full md:flex md:w-auto md:gap-4">
                {/* 2. Quero Assistir (Watchlist com toggle e persistência) */}
                <button
                  type="button"
                  onClick={() => toggleWatchlist(movie.id)}
                  aria-pressed={isWatchlist}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 px-3 sm:px-5 py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95 ${
                    isWatchlist
                      ? "bg-[#ffcc00] text-black border border-[#ffcc00] font-bold shadow-[0_0_20px_rgba(255,204,0,0.3)]"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/40 backdrop-blur-md"
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 flex-shrink-0 ${
                      isWatchlist ? "fill-current stroke-current" : "stroke-[2.2]"
                    }`}
                  />
                  <span className="truncate">{isWatchlist ? "Quero Assistir ✓" : "Quero Assistir"}</span>
                </button>

                {/* 3. Já Assisti (Watched History com toggle e persistência) */}
                <button
                  type="button"
                  onClick={() => toggleWatched(movie.id)}
                  aria-pressed={isWatched}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 px-3 sm:px-5 py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95 ${
                    isWatched
                      ? "bg-emerald-500 text-black border border-emerald-400 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/40 backdrop-blur-md"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 flex-shrink-0 ${
                      isWatched ? "stroke-[3]" : "stroke-[2.2]"
                    }`}
                  />
                  <span className="truncate">{isWatched ? "Já Assisti ✓" : "Já Assisti"}</span>
                </button>
              </div>
            </div>

            {/* Onde Assistir (Watch Providers Brasil com título visível em destaque) */}
            <WatchProvidersRow
              providers={providers}
              isLoading={isLoadingProviders}
              movieTitle={movie.title}
            />

            {/* Ficha de Produção & Finanças (com Direção no topo) */}
            {hasProductionDetails && (
              <div className="flex flex-col gap-2 md:gap-2.5 pt-3 border-t border-white/10 text-center md:text-left w-full">
                {/* Linha 1: Direção */}
                {hasDirectors && (
                  <div className="text-center md:text-left">
                    <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider mr-1.5">
                      Direção:
                    </span>
                    <span className="font-medium text-zinc-100 text-sm">
                      {credits!.directors!.join(", ")}
                    </span>
                  </div>
                )}

                {/* Linha 2: Orçamento e Bilheteria SEMPRE juntos e primeiro, com cores semânticas apenas quando ambos existem */}
                {(formattedBudget || formattedRevenue) && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3.5 sm:gap-x-6 gap-y-1">
                    {formattedBudget && (
                      <div className="flex items-center whitespace-nowrap">
                        <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider mr-1.5">
                          Orçamento:
                        </span>
                        <span
                          className={`font-semibold text-xs sm:text-sm ${
                            hasFinancialContrast ? "text-rose-400" : "text-zinc-100"
                          }`}
                        >
                          {formattedBudget}
                        </span>
                      </div>
                    )}

                    {formattedRevenue && (
                      <div className="flex items-center whitespace-nowrap">
                        <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider mr-1.5">
                          Bilheteria:
                        </span>
                        <span
                          className={`font-semibold text-xs sm:text-sm ${
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
                  <div className="text-center md:text-left">
                    <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider mr-1.5">
                      Título Original:
                    </span>
                    <span className="font-medium text-zinc-100 text-sm">
                      {originalTitle}
                    </span>
                  </div>
                )}

                {/* Linha 4: Produtoras com fluxo contínuo e quebra natural */}
                {companiesList && (
                  <div className="text-center md:text-left">
                    <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider mr-1.5">
                      Produtoras:
                    </span>
                    <span className="font-medium text-zinc-100 text-sm">
                      {companiesList}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Sinopse com linha divisória e espaçamento unificado */}
        {movie.overview ? (
          <section className="w-full border-t border-white/10 pt-6 md:pt-8">
            <div className="max-w-2xl sm:max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-3">
              <h3 className="text-xs sm:text-sm uppercase tracking-widest text-zinc-400 font-bold text-center w-full">
                Sinopse
              </h3>
              <p className="text-base sm:text-lg md:text-xl text-white leading-relaxed font-normal text-left">
                {movie.overview}
              </p>
            </div>
          </section>
        ) : null}

        {/* Elenco Principal com linha divisória e espaçamento unificado */}
        {(isLoadingCredits || (credits?.cast && credits.cast.length > 0)) ? (
          <section className="w-full border-t border-white/10 pt-6 md:pt-8">
            <CastCarousel cast={credits?.cast} isLoading={isLoadingCredits} />
          </section>
        ) : null}

        {/* Galeria de Fotos com linha divisória e espaçamento unificado */}
        {(isLoadingGallery || (gallery && gallery.length > 0)) ? (
          <section className="w-full border-t border-white/10 pt-6 md:pt-8">
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
      </main>

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
