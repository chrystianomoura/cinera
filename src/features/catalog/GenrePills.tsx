import { GENRES } from "./constants";

interface GenrePillsProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function GenrePills({ selectedGenre, onSelectGenre }: GenrePillsProps) {
  return (
    <section className="relative w-full">
      {/* 
        Desktop (md+): Flex container com justify-between preenchendo 100% da largura do grid de ponta a ponta.
        Mobile (<md): Scroll horizontal nativo fluido por touch com padding de respiro.
      */}
      <div className="flex md:justify-between items-center gap-2 overflow-x-auto md:overflow-visible scrollbar-hide px-4 md:px-0 py-1 w-full">
        {["Todos", ...GENRES].map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <button
              key={genre}
              data-genre-name={genre}
              onClick={() => onSelectGenre(genre)}
              className={`flex-shrink-0 px-3.5 sm:px-4 lg:px-4.5 py-2 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-white text-black font-bold shadow-[0_2px_14px_rgba(255,255,255,0.25)] border border-white"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 hover:border-white/25 active:scale-95"
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
