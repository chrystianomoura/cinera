import { memo, useState } from "react";
import { Film } from "lucide-react";
import type { Movie } from "@/domain";
import { getPosterUrl } from "@/infrastructure/api/movie-service";

interface MovieCardProps {
  movie: Movie;
  isEager?: boolean;
  className?: string;
  onClick?: (movie: Movie) => void;
}

export const MovieCard = memo(function MovieCard({
  movie,
  isEager = false,
  className,
  onClick,
}: MovieCardProps) {
  const [hasError, setHasError] = useState(false);

  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, "w342") : "";
  const posterUrlHd = movie.posterPath ? getPosterUrl(movie.posterPath, "w500") : "";
  // Celular: sempre w342 (w500 nas categorias fez os pôsteres tremerem na rolagem). Tela grande de alta densidade: w500.
  const hdSrcSet = `${posterUrl} 1x, ${posterUrlHd} 2x`;
  const releaseYear = movie.releaseDate?.slice(0, 4) || "—";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(movie);
    }
  };

  return (
    <div
      className={`movie-card relative flex flex-col gap-2 select-none [scroll-snap-align:start] [scroll-snap-stop:normal] [contain:layout_style] ${
        className ?? "flex-shrink-0 w-36 sm:w-44 md:w-52 lg:w-60"
      }`}
    >
      {/* Hitbox estática do pôster: recebe clique e foco sem deslocamento físico */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(movie)}
        onKeyDown={handleKeyDown}
        aria-label={`Ver detalhes de ${movie.title}`}
        className="group/poster aspect-[2/3] w-full relative cursor-pointer select-none focus-visible:outline-none"
      >
        <div className="w-full h-full rounded-xl bg-zinc-900 border border-white/10 relative transition-colors duration-150 ease-out">
          {/* O arredondamento fica na própria imagem, e não num contêiner com overflow-hidden: recortar cada pôster por um
              contêiner arredondado, dentro de uma fileira que rola, custava quadros no iPhone. */}
          {posterUrl && !hasError ? (
            <picture className="contents">
              <source media="(min-width: 768px)" srcSet={hdSrcSet} />
              <img
                src={posterUrl}
                alt={`Pôster de ${movie.title}`}
                className="h-full w-full rounded-[0.7rem] object-cover pointer-events-none"
                loading={isEager ? "eager" : "lazy"}
                decoding="async"
                onError={() => setHasError(true)}
              />
            </picture>
          ) : (
            <div className="flex flex-col h-full w-full items-center justify-center rounded-[0.7rem] bg-zinc-900 text-zinc-400 text-center p-4 pointer-events-none">
              <Film className="w-8 h-8 mb-2 text-zinc-600" />
              <span className="text-[10px] uppercase tracking-widest mb-1 font-mono text-zinc-400">
                Sem Imagem
              </span>
              <span className="font-semibold text-xs leading-tight text-zinc-400 line-clamp-2">
                {movie.title}
              </span>
            </div>
          )}

          {/* Borda de seleção sobre o pôster, contida dentro dele */}
          <div className="absolute inset-0 rounded-xl border-[2.5px] border-white pointer-events-none transition-opacity duration-150 opacity-0 group-hover/poster:opacity-100 group-focus-visible/poster:opacity-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.8)]" />
        </div>
      </div>

      <div className="flex flex-col px-0.5 pt-1 pointer-events-none select-none">
        <p className="truncate text-sm md:text-base font-bold text-white tracking-tight leading-snug">
          {movie.title}
        </p>
        <span className="text-xs md:text-[13px] font-medium text-zinc-400 mt-0.5 tracking-normal">
          {releaseYear}
        </span>
      </div>
    </div>
  );
});
