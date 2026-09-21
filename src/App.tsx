import { Search } from "lucide-react";
import { useTrendingMovies } from "@/hooks/use-movies";
import { getPosterUrl, getBackdropUrl } from "@/infrastructure/api/movie-service";

const GENRES = [
  "Ação", "Aventura", "Animação", "Comédia", "Crime", "Documentário", 
  "Drama", "Família", "Fantasia", "História", "Terror", "Música", 
  "Mistério", "Ficção Científica", "Cinema TV", "Thriller", "Guerra", "Faroeste"
];

export default function App() {
  const { data, isLoading, isError } = useTrendingMovies(1);

  // Encontra o primeiro filme com backdrop para o Hero
  const heroMovie = data?.results.find((m) => m.backdropPath) || data?.results[0];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 pb-20 relative flex flex-col">
      {/* Header Sticky (Ocupa espaço e empurra a foto para baixo) */}
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5 transition-all duration-300 px-6 py-5 flex items-center justify-between">
        {/* LOGO */}
        <h1 className="tracking-widest font-black text-3xl md:text-4xl text-white uppercase font-serif drop-shadow-lg">
          Cinera
        </h1>
        
        {/* Barra de Pesquisa */}
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-lg hidden md:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            </div>
            {/* Placeholder maior (text-base), cor hover mais suave */}
            <input
              type="text"
              placeholder="Pesquisar filmes..."
              className="w-full bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-800/90 border border-transparent focus:border-zinc-700 rounded-full py-2.5 pl-11 pr-4 text-base text-white placeholder:text-zinc-500 outline-none transition-all duration-300 ring-0"
            />
          </div>
        </div>
        
        <div className="w-24"></div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[75vh] flex items-end pb-10 px-6 md:px-12">
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        )}
        
        {!isLoading && heroMovie && (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <img 
                src={getBackdropUrl(heroMovie.backdropPath)} 
                alt={heroMovie.title}
                className="w-full h-full object-cover object-top opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-transparent" />
            </div>
            
            <div className="relative z-10 max-w-4xl">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-5 leading-tight drop-shadow-2xl">
                {heroMovie.title}
              </h2>
              {/* SINOPSE: Removido line-clamp, texto inteiro */}
              <p className="text-zinc-300 text-base md:text-lg max-w-xl font-normal drop-shadow-lg leading-relaxed">
                {heroMovie.overview}
              </p>
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
          <h3 className="text-3xl font-semibold mb-6 text-white tracking-tight">Em Alta</h3>
          
          {isError && (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center backdrop-blur-sm">
              <p className="text-zinc-400">
                Ocorreu um erro ao carregar os filmes. Tente novamente mais tarde.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex gap-4 md:gap-6 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36 md:w-48 lg:w-56 flex flex-col gap-3 animate-pulse">
                  <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900"></div>
                  <div className="h-4 w-3/4 rounded bg-zinc-900"></div>
                  <div className="h-3 w-1/4 rounded bg-zinc-900"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-4 scrollbar-hide snap-x">
              {data?.results.map((movie) => (
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
                        <span className="text-[10px] uppercase tracking-widest mb-2 font-mono">Sem Imagem</span>
                        <span className="font-semibold text-sm leading-tight text-zinc-400">{movie.title}</span>
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
    </div>
  );
}
