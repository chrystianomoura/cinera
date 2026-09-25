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
  isEager = true,
  className,
  onClick,
}: MovieCardProps) {
  const [hasError, setHasError] = useState(false);

  // Utiliza w342 para carregamento instantâneo e leve sem sobrecarregar a rede
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, "w342") : "";

  return (
    <div
      onClick={() => onClick?.(movie)}
      className={`group/card relative flex flex-col gap-2 cursor-pointer ${
        className ?? "flex-shrink-0 w-36 md:w-48 lg:w-56"
      }`}
    >
      {/* Card do Pôster */}
      {/* ANIMAÇÃO: Subida suave e aveludada (-translate-y-3) com sombra difusa elegante */}
      <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5 relative transition-all duration-300 ease-out group-hover/card:-translate-y-3 group-hover/card:shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
        {posterUrl && !hasError ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover"
            loading={isEager ? "eager" : "lazy"}
            decoding="async"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex flex-col h-full w-full items-center justify-center bg-zinc-900 text-zinc-500 text-center p-4">
            <Film className="w-8 h-8 mb-2 text-zinc-600" />
            <span className="text-[10px] uppercase tracking-widest mb-1 font-mono text-zinc-500">
              Sem Imagem
            </span>
            <span className="font-semibold text-xs leading-tight text-zinc-400 line-clamp-2">
              {movie.title}
            </span>
          </div>
        )}

        {/* Badge IMDb Clássica: Alto contraste sem blur pesado que sobrecarrega a GPU */}
        <div className="absolute top-3 right-3 flex items-center rounded overflow-hidden shadow-lg border border-black/20">
          <span className="bg-[#f5c518] text-black text-xs font-black px-2 py-1 tracking-wider uppercase">
            IMDb
          </span>
          <span className="bg-zinc-950/90 text-white text-xs font-bold px-2 py-1">
            {movie.voteAverage.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Detalhes Textuais Estáveis e Vivos */}
      <div className="flex flex-col px-0.5 pt-1">
        <h4 className="truncate text-sm md:text-base font-bold text-white tracking-tight leading-snug">
          {movie.title}
        </h4>
        <span className="text-xs md:text-[13px] font-medium text-zinc-400 mt-0.5 tracking-normal">
          {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "—"}
        </span>
      </div>
    </div>
  );
});
