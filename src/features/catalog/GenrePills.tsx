import { ChevronLeft, ChevronRight } from "lucide-react";
import { GENRES } from "./constants";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

interface GenrePillsProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function GenrePills({ selectedGenre, onSelectGenre }: GenrePillsProps) {
  const {
    containerRef: genresRowRef,
    canScrollLeft: canScrollLeftGenres,
    canScrollRight: canScrollRightGenres,
    scroll: scrollGenres,
  } = useHorizontalScroll({ defaultScrollFraction: 0.75, threshold: 28 });

  return (
    <section className="relative group/pills">
      {/* Borda de fade esquerda suave e aveludada sem corte brusco */}
      <div
        className={`hidden md:block absolute left-0 top-0 bottom-0 w-14 sm:w-20 md:w-24 bg-gradient-to-r from-black via-black/40 via-40% to-transparent z-20 pointer-events-none transition-opacity duration-300 ease-in-out ${
          canScrollLeftGenres
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* Seta esquerda com estilo tonal estável de streaming */}
      <button
        onClick={() => scrollGenres("left")}
        aria-label="Rolar gêneros para a esquerda"
        tabIndex={canScrollLeftGenres ? 0 : -1}
        className={`hidden md:flex absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 items-center justify-center rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-opacity duration-150 cursor-pointer pointer-events-none ${
          canScrollLeftGenres
            ? "opacity-0 group-hover/pills:opacity-100 group-hover/pills:pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="w-5 h-5 stroke-[2.5] pointer-events-none" />
      </button>

      <div
        ref={genresRowRef}
        className="flex gap-3 md:gap-4 overflow-x-auto pt-1 pb-1.5 scrollbar-hide px-4 md:px-0"
      >
        {["Todos", ...GENRES].map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <button
              key={genre}
              data-genre-name={genre}
              onClick={() => onSelectGenre(genre)}
              className={`flex-shrink-0 px-7 py-2.5 rounded-full text-sm md:text-base transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-white text-black font-bold shadow-[0_2px_14px_rgba(255,255,255,0.25)] border border-white"
                  : "bg-zinc-800/80 hover:bg-zinc-700/80 text-white font-semibold border border-white/15 hover:border-white/35"
              }`}
            >
              {genre}
            </button>
          );
        })}
        <div className="flex-shrink-0 w-12 md:w-16 pointer-events-none" aria-hidden="true" />
      </div>

      {/* Borda de fade direita suave e aveludada sem corte brusco */}
      <div
        className={`hidden md:block absolute right-0 top-0 bottom-0 w-14 sm:w-20 md:w-24 bg-gradient-to-l from-black via-black/40 via-40% to-transparent z-20 pointer-events-none transition-opacity duration-300 ease-in-out ${
          canScrollRightGenres
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* Seta direita com estilo tonal estável de streaming */}
      <button
        onClick={() => scrollGenres("right")}
        aria-label="Rolar gêneros para a direita"
        tabIndex={canScrollRightGenres ? 0 : -1}
        className={`hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 items-center justify-center rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-opacity duration-150 cursor-pointer pointer-events-none ${
          canScrollRightGenres
            ? "opacity-0 group-hover/pills:opacity-100 group-hover/pills:pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="w-5 h-5 stroke-[2.5] pointer-events-none" />
      </button>
    </section>
  );
}
