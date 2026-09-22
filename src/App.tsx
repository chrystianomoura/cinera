import { useState, useEffect } from "react";
import { Search, Play, Info, X } from "lucide-react";
import { useTrendingMovies, useHeroFeaturedMovies } from "@/hooks/use-movies";
import {
  getPosterUrl,
  getBackdropUrl,
  movieService,
} from "@/infrastructure/api/movie-service";

const GENRES = [
  "Ação",
  "Aventura",
  "Animação",
  "Comédia",
  "Crime",
  "Documentário",
  "Drama",
  "Família",
  "Fantasia",
  "História",
  "Terror",
  "Música",
  "Mistério",
  "Ficção Científica",
  "Cinema TV",
  "Thriller",
  "Guerra",
  "Faroeste",
];

function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export default function App() {
  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    isError: isErrorTrending,
  } = useTrendingMovies(1);
  const { data: heroMovies, isLoading: isLoadingHero } =
    useHeroFeaturedMovies();

  const heroCandidates = heroMovies || [];

  // Sorteia um índice aleatório inicial
  const [heroIndex, setHeroIndex] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const heroMovie =
    heroCandidates.length > 0
      ? heroCandidates[heroIndex % heroCandidates.length]
      : null;

  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [trailerData, setTrailerData] = useState<{
    movieId: number;
    key: string | null;
  } | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  // Deriva a chave do trailer apenas para o filme ativo no Hero
  const trailerKey =
    heroMovie?.id && trailerData?.movieId === heroMovie.id
      ? trailerData.key
      : null;

  // Rotação automática a cada 8 segundos com crossfade suave (pausa no hover ou trailer aberto)
  useEffect(() => {
    if (heroCandidates.length <= 1 || isTrailerOpen || isHovered) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % heroCandidates.length);
        setIsFading(false);
      }, 700);
    }, 8000);

    return () => clearInterval(interval);
  }, [heroCandidates.length, isTrailerOpen, isHovered]);

  const handleOpenTrailer = async () => {
    if (!heroMovie) return;
    setIsTrailerOpen(true);
    if (trailerData?.movieId !== heroMovie.id) {
      setIsLoadingTrailer(true);
      try {
        const videos = await movieService.getMovieVideos(heroMovie.id);
        const trailer =
          videos.find(
            (v) =>
              v.site === "YouTube" &&
              (v.type === "Trailer" || v.type === "Teaser"),
          ) ||
          videos.find((v) => v.site === "YouTube") ||
          videos[0];
        setTrailerData({ movieId: heroMovie.id, key: trailer?.key || null });
      } catch (err) {
        console.error("Erro ao carregar trailer:", err);
      } finally {
        setIsLoadingTrailer(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 pb-20 relative flex flex-col">
      {/* Header Fixo Translúcido flutuando com efeito Vidro Fumê Lapidado sobre o filme */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-300 px-6 py-4 md:py-5 flex items-center justify-between gap-4">
        {/* LOGO */}
        <h1 className="tracking-widest font-black text-3xl md:text-4xl text-white uppercase font-serif drop-shadow-md flex-shrink-0">
          Cinera
        </h1>

        {/* Barra de Pesquisa em Vidro Harmonizado alinhada à direita */}
        <div className="relative group w-64 sm:w-80 md:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar filmes..."
            className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/60 border border-white/10 focus:border-white/25 rounded-full py-2.5 pl-11 pr-4 text-sm md:text-base text-white placeholder:text-zinc-400 outline-none backdrop-blur-md transition-all duration-300 shadow-inner"
          />
        </div>
      </header>

      {/* Hero Section Full-Bleed iniciando no top:0 absoluto sob o header */}
      <section
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full min-h-[80vh] md:min-h-[88vh] flex items-end pb-12 px-6 md:px-12 pt-28 md:pt-32 overflow-hidden"
      >
        {(isLoadingHero || !heroMovie) && (
          <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        )}

        {!isLoadingHero && heroMovie && (
          <>
            <div
              className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${isFading ? "opacity-0" : "opacity-100"}`}
            >
              <img
                key={heroMovie.id}
                src={getBackdropUrl(heroMovie.backdropPath)}
                alt={heroMovie.title}
                className="w-full h-full object-cover object-top animate-kenburns origin-center"
              />
              {/* Degradê superior sutil apenas para garantir legibilidade da barra e logo sob o vidro */}
              <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />

              {/* Degradê inferior cinematográfico: restrito aos 50% inferiores, mantendo o topo e centro 100% livres e preservando as cores reais da fotografia */}
              <div
                className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.2) 75%, transparent 100%)",
                }}
              />
            </div>

            <div
              className={`relative z-10 max-w-3xl transition-all duration-700 transform ${isFading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
            >
              {/* 1. TÍTULO PRINCIPAL: se contiver dois pontos (:), quebra a linha mantendo a mesma formatação e tamanho */}
              {(() => {
                const colonIndex = heroMovie.title.indexOf(":");
                if (colonIndex !== -1) {
                  const part1 = heroMovie.title.slice(0, colonIndex).trim();
                  const part2 = heroMovie.title.slice(colonIndex + 1).trim();
                  const longestPart = Math.max(part1.length, part2.length);

                  return (
                    <h2
                      className={`font-black tracking-tight text-white mb-2.5 leading-[1.08] drop-shadow-2xl max-w-3xl ${
                        longestPart > 24
                          ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                          : "text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                      }`}
                    >
                      <span>{part1}:</span>
                      {part2 && (
                        <>
                          <br />
                          <span>{part2}</span>
                        </>
                      )}
                    </h2>
                  );
                }

                return (
                  <h2
                    className={`font-black tracking-tight text-white mb-2.5 leading-[1.08] drop-shadow-2xl ${
                      heroMovie.title.length > 32
                        ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-2xl"
                        : heroMovie.title.length > 18
                          ? "text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-2xl"
                          : "text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-xl"
                    }`}
                  >
                    {heroMovie.title}
                  </h2>
                );
              })()}

              {/* 2. META-DADOS LIMPOS: Tipografia pura, alinhada à esquerda, com branco uniforme e pontos de destaque */}
              {(() => {
                const rawGenre = heroMovie.genres?.[0]?.name || null;
                const heroGenre = rawGenre ? rawGenre.toUpperCase() : null;
                const releaseYear = heroMovie.releaseDate
                  ? heroMovie.releaseDate.slice(0, 4)
                  : null;
                const runtimeFormatted = formatRuntime(heroMovie.runtime);

                return (
                  <div className="flex flex-wrap items-center gap-2.5 md:gap-3 mb-3 text-sm md:text-base">
                    {/* Gênero Principal em Capslock com destaque */}
                    {heroGenre && (
                      <span className="font-bold text-white tracking-wider uppercase text-xs md:text-sm drop-shadow-md">
                        {heroGenre}
                      </span>
                    )}

                    {/* Separador nítido em branco */}
                    {heroGenre && releaseYear && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                    )}

                    {/* Ano em branco puro uniforme */}
                    {releaseYear && (
                      <span className="font-semibold text-white text-xs md:text-sm drop-shadow-md">
                        {releaseYear}
                      </span>
                    )}

                    {/* Separador nítido em branco */}
                    {releaseYear && runtimeFormatted && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                    )}

                    {/* Duração em branco puro uniforme */}
                    {runtimeFormatted && (
                      <span className="font-semibold text-white text-xs md:text-sm drop-shadow-md">
                        {runtimeFormatted}
                      </span>
                    )}

                    {/* Separador nítido em branco */}
                    {(heroGenre || releaseYear || runtimeFormatted) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                    )}

                    {/* Nota IMDb clássica de alto contraste */}
                    <div className="flex items-center rounded overflow-hidden shadow-sm border border-black/30">
                      <span className="bg-[#f5c518] text-black text-xs font-black px-1.5 py-0.5 tracking-wider uppercase">
                        IMDb
                      </span>
                      <span className="bg-black/75 text-white text-xs font-bold px-2 py-0.5 backdrop-blur-md">
                        {heroMovie.voteAverage.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 3. TAGLINE OFICIAL DO FILME: logo abaixo dos metadados, servindo de ponte para os botões */}
              {heroMovie.tagline && (
                <p className="text-zinc-200 text-base sm:text-lg md:text-xl font-medium italic mb-6 drop-shadow-md max-w-2xl">
                  {heroMovie.tagline
                    .replace(/^["'“”«»]+|["'“”«»]+$/g, "")
                    .trim()}
                </p>
              )}

              {/* BOTÕES DE AÇÃO: Trailer e Ver Detalhes (desativado por enquanto) */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleOpenTrailer}
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black font-bold text-base hover:bg-zinc-200 transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 cursor-pointer group"
                >
                  <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                  <span>Trailer</span>
                </button>

                <button
                  disabled
                  title="Página de detalhes em desenvolvimento"
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-zinc-900/40 text-zinc-500 font-semibold text-base border border-white/5 cursor-not-allowed select-none"
                >
                  <Info className="w-5 h-5 text-zinc-500" />
                  <span>Ver Detalhes</span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Main Content */}
      <main className="relative z-10 px-6 md:px-12 flex flex-col gap-10">
        {/* Pílulas de Gênero */}
        <section>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {GENRES.map((genre) => (
              <button
                key={genre}
                className="snap-start flex-shrink-0 px-8 py-3 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-zinc-400 hover:bg-zinc-800 transition-all duration-300 text-base font-medium text-zinc-400 hover:text-white"
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Carrossel Em Alta */}
        <section>
          {/* TÍTULO EM ALTA: Margem inferior restaurada para mb-6 para dar espaço aos cards */}
          <h3 className="text-3xl font-semibold mb-6 text-white tracking-tight">
            Em Alta
          </h3>

          {isErrorTrending && (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center backdrop-blur-sm">
              <p className="text-zinc-400">
                Ocorreu um erro ao carregar os filmes. Tente novamente mais
                tarde.
              </p>
            </div>
          )}

          {isLoadingTrending ? (
            <div className="flex gap-4 md:gap-6 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-36 md:w-48 lg:w-56 flex flex-col gap-3 animate-pulse"
                >
                  <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900"></div>
                  <div className="h-4 w-3/4 rounded bg-zinc-900"></div>
                  <div className="h-3 w-1/4 rounded bg-zinc-900"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-4 scrollbar-hide snap-x">
              {trendingData?.results.map((movie) => (
                <div
                  key={movie.id}
                  className="snap-start flex-shrink-0 w-36 md:w-48 lg:w-56 group relative flex flex-col gap-2 cursor-pointer"
                >
                  {/* Card do Pôster */}
                  {/* ANIMAÇÃO: Apenas -translate-y-3 e sombra, sem alterar a borda no hover */}
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5 relative transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                    {movie.posterPath ? (
                      <img
                        src={getPosterUrl(movie.posterPath)}
                        alt={movie.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col h-full w-full items-center justify-center bg-zinc-900 text-zinc-500 text-center p-4">
                        <span className="text-[10px] uppercase tracking-widest mb-2 font-mono">
                          Sem Imagem
                        </span>
                        <span className="font-semibold text-sm leading-tight text-zinc-400">
                          {movie.title}
                        </span>
                      </div>
                    )}

                    {/* Badge IMDb Clássica: Maior legibilidade (text-xs e px-2 py-1) */}
                    <div className="absolute top-3 right-3 flex items-center rounded overflow-hidden shadow-lg border border-black/20">
                      <span className="bg-[#f5c518] text-black text-xs font-black px-2 py-1 tracking-wider uppercase">
                        IMDb
                      </span>
                      <span className="bg-black/80 text-white text-xs font-bold px-2 py-1 backdrop-blur-md">
                        {movie.voteAverage.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes Textuais */}
                  <div className="flex flex-col px-1">
                    <h4 className="truncate text-sm md:text-base font-semibold text-zinc-300 group-hover:text-white transition-colors duration-300">
                      {movie.title}
                    </h4>
                    <span className="text-xs text-zinc-500 mt-1">
                      {new Date(movie.releaseDate).getFullYear()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Trailer com Título Centralizado */}
      {isTrailerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Cabeçalho com título centralizado */}
            <div className="relative flex items-center justify-center px-12 py-4 border-b border-white/10 bg-zinc-900/80">
              <h4 className="text-base md:text-lg font-semibold text-white tracking-wide text-center truncate">
                {heroMovie?.title} — Trailer Oficial
              </h4>
              <button
                onClick={() => setIsTrailerOpen(false)}
                className="absolute right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {isLoadingTrailer && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-sm text-zinc-400">
                    Carregando trailer...
                  </span>
                </div>
              )}
              {!isLoadingTrailer && trailerKey ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                  title={`${heroMovie?.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : !isLoadingTrailer ? (
                <div className="p-8 text-center text-zinc-400">
                  <p>
                    Nenhum trailer encontrado diretamente na API para este
                    filme.
                  </p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                      `${heroMovie?.title || ""} trailer oficial`,
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
      )}
    </div>
  );
}
