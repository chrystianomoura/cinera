import { GENRES } from "./constants";

interface GenrePillsProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function GenrePills({ selectedGenre, onSelectGenre }: GenrePillsProps) {
  return (
    <section className="relative w-full">
      {/* 
        - Mobile (<md): Touch scroll natural com touch targets confortáveis (py-2.5 px-4.5 text-sm),
          espaçamento compacto (gap-2.5), padding simétrico (px-4 de ponta a ponta) e sem fades estáticos cortando 'Terror'.
        - Desktop (md+): Grid flex harmonioso com gap-2.5 natural e acolhedor. Cada pílula cresce de forma equilibrada 
          para cobrir a largura útil de ponta a ponta com simetria milimétrica, sem criar abismos vazios.
      */}
      <div className="flex md:flex-wrap items-center gap-2 sm:gap-2.5 overflow-x-auto md:overflow-visible scrollbar-hide px-4 md:px-0 py-1.5 w-full">
        {["Todos", ...GENRES].map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <button
              key={genre}
              data-genre-name={genre}
              onClick={() => onSelectGenre(genre)}
              className={`flex-shrink-0 md:flex-1 md:min-w-fit px-4 sm:px-4.5 lg:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer select-none text-center whitespace-nowrap ${
                isSelected
                  ? "bg-white/15 text-white border-2 border-white shadow-[0_0_16px_rgba(255,255,255,0.2)]"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/20 hover:border-white/40 active:scale-95 shadow-sm"
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
