import { Loader2 } from "lucide-react";
import type { Movie } from "@/domain";
import { MovieCard } from "./MovieCard";

interface GenreCatalogGridProps {
  genreName: string;
  movies?: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

export function GenreCatalogGrid({
  genreName,
  movies = [],
  isLoading = false,
  isError = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onSelectMovie,
}: GenreCatalogGridProps) {
  return (
    <section className="flex flex-col gap-6 pt-2 pb-12 animate-in fade-in duration-300">
      {/* Cabeçalho do Catálogo com contagem e destaque */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Catálogo de {genreName}
          </h2>
          <p className="text-sm md:text-base text-zinc-400 mt-1">
            Explorando os títulos mais populares e aclamados deste gênero
          </p>
        </div>

        {movies.length > 0 && (
          <span className="text-xs md:text-sm font-mono text-zinc-400 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-full">
            {movies.length} {movies.length === 1 ? "título" : "títulos"} encontrados
          </span>
        )}
      </div>

      {isError && (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center backdrop-blur-sm">
          <p className="text-zinc-400">
            Ocorreu um erro ao carregar os filmes deste gênero. Tente novamente mais tarde.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 animate-pulse w-full">
              <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900"></div>
              <div className="h-4 w-3/4 rounded bg-zinc-900"></div>
              <div className="h-3 w-1/4 rounded bg-zinc-900"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isEager={false}
                className="w-full"
                onClick={onSelectMovie}
              />
            ))}
          </div>

          {movies.length === 0 && !isError && (
            <div className="rounded-xl bg-zinc-900/30 border border-white/5 p-12 text-center">
              <p className="text-zinc-400 text-base">
                Nenhum filme qualificado encontrado para este gênero no momento.
              </p>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-6">
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="px-8 py-3.5 rounded-full bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black border border-white/15 hover:border-white font-semibold text-sm transition-all duration-300 cursor-pointer shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando mais filmes...</span>
                  </>
                ) : (
                  <span>Carregar Mais Filmes</span>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
