import { useEffect, useRef } from "react";
import { GENRES } from "./constants";

interface GenrePillsProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function GenrePills({ selectedGenre, onSelectGenre }: GenrePillsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // No mobile, centraliza suavemente a pílula ativa apenas dentro do container (sem pular a página verticalmente)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-genre-name="${CSS.escape(selectedGenre)}"]`);
    if (!activeBtn) return;

    // Apenas rola se o container estiver no modo scroll horizontal (<md)
    if (container.scrollWidth > container.clientWidth) {
      const scrollOffset = activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollOffset), behavior: "smooth" });
    }
  }, [selectedGenre]);

  return (
    <section className="relative w-full" role="group" aria-label="Filtrar catálogo por gênero">
      <div
        ref={containerRef}
        className="flex md:flex-wrap items-center gap-2 sm:gap-2.5 overflow-x-auto md:overflow-visible scrollbar-hide px-4 md:px-0 py-1.5 w-full"
      >
        {["Todos", ...GENRES].map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <button
              key={genre}
              type="button"
              data-genre-name={genre}
              aria-pressed={isSelected}
              onClick={() => onSelectGenre(genre)}
              className={`flex-shrink-0 md:flex-1 md:min-w-fit px-4 sm:px-5 py-2 min-h-[40px] md:min-h-0 rounded-full text-xs sm:text-sm tracking-wide transition-all duration-200 cursor-pointer select-none text-center whitespace-nowrap active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${
                isSelected
                  ? "bg-white/20 backdrop-blur-xl text-white font-bold border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium border border-white/15 hover:border-white/30 backdrop-blur-sm shadow-sm"
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </section>
  );
}
