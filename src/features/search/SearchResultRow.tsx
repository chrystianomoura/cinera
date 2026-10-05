import { memo } from "react";
import { ChevronRight, Film } from "lucide-react";
import { getPosterUrl } from "@/infrastructure/api/movie-service";
import { formatCategories, type Movie } from "@/domain";
import { resolveCategories, type CategoryIndex } from "@/infrastructure/catalog/category-index";

interface SearchResultRowProps {
  movie: Movie;
  index: number;
  isSelected: boolean;
  categoryIndex: CategoryIndex | null | undefined;
  onSelect: (movie: Movie) => void;
  onHover: (index: number) => void;
}

/**
 * Uma linha da lista de resultados. Memoizada: digitar ou passar o mouse só re-renderiza as linhas que mudaram
 * (antes, a lista inteira era refeita a cada tecla e a cada movimento do mouse).
 */
// No toque, o navegador simula um "mouse entrou" ao tocar: isso marcava a linha como selecionada (cinza) antes do clique
const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export const SearchResultRow = memo(function SearchResultRow({
  movie,
  index,
  isSelected,
  categoryIndex,
  onSelect,
  onHover,
}: SearchResultRowProps) {
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, "w342") : "";
  const releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
  // Só categorias que existem no Cinera (as mesmas da ficha), nunca gêneros soltos do TMDB
  const categoryLabel = formatCategories(resolveCategories(movie, categoryIndex));

  return (
    <div
      id={`search-item-${index}`}
      role="option"
      aria-selected={isSelected}
      data-search-index={index}
      onClick={() => onSelect(movie)}
      onMouseEnter={canHover ? () => onHover(index) : undefined}
      className={`group [-webkit-tap-highlight-color:transparent] flex items-center gap-4 px-3 py-3 rounded-2xl cursor-pointer transition-[background-color,box-shadow] duration-150 [content-visibility:auto] [contain-intrinsic-size:auto_121px] select-none active:bg-white/10 border-b border-white/[0.06] last:border-b-0 ${
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
            decoding="async"
            width={64}
            height={96}
            className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-200"
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
});
