import { useEffect } from "react";
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
    containerElement,
    canScrollLeft: canScrollLeftGenres,
    canScrollRight: canScrollRightGenres,
    scroll: scrollGenres,
  } = useHorizontalScroll({ defaultScrollFraction: 0.6 });

  // Rola a barra horizontal para centralizar a pílula ativa com precisão milimétrica em qualquer tela
  useEffect(() => {
    if (!containerElement) return;

    const scrollToActivePill = () => {
      const activePill = containerElement.querySelector<HTMLElement>(
        `[data-genre-name="${selectedGenre}"]`
      );
      if (!activePill) return;

      const containerRect = containerElement.getBoundingClientRect();
      const pillRect = activePill.getBoundingClientRect();

      // Deslocamento relativo da pílula em relação ao container horizontal
      const relativePillLeft = pillRect.left - containerRect.left + containerElement.scrollLeft;
      const targetScroll = Math.max(
        0,
        relativePillLeft - (containerRect.width / 2) + (pillRect.width / 2)
      );

      containerElement.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    };

    // Executa imediatamente e com um micro-tick para garantir que o layout pós-modal já completou
    scrollToActivePill();
    const rafId = requestAnimationFrame(() => {
      scrollToActivePill();
    });
    const timer = setTimeout(scrollToActivePill, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [selectedGenre, containerElement]);

  return (
    <section className="relative group/pills">
      <div
        className={`hidden md:flex absolute left-0 inset-y-0 w-28 bg-gradient-to-r from-black from-35% via-black/70 to-transparent z-20 items-center justify-start pointer-events-none transition-opacity ${
          canScrollLeftGenres
            ? "opacity-100 duration-300 ease-out"
            : "opacity-0 duration-700 ease-out"
        }`}
      >
        <button
          onClick={() => scrollGenres("left")}
          aria-label="Rolar gêneros para a esquerda"
          tabIndex={canScrollLeftGenres ? 0 : -1}
          className={`pointer-events-auto w-8 h-8 rounded-full bg-zinc-950/90 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ml-4 ${
            !canScrollLeftGenres ? "pointer-events-none invisible" : ""
          }`}
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

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

      <div
        className={`hidden md:flex absolute right-0 inset-y-0 w-28 bg-gradient-to-l from-black from-35% via-black/70 to-transparent z-20 items-center justify-end pointer-events-none transition-opacity duration-300 ${
          canScrollRightGenres ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={() => scrollGenres("right")}
          aria-label="Rolar gêneros para a direita"
          tabIndex={canScrollRightGenres ? 0 : -1}
          className={`pointer-events-auto w-8 h-8 rounded-full bg-zinc-950/90 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer mr-4 ${
            !canScrollRightGenres ? "pointer-events-none invisible" : ""
          }`}
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}
