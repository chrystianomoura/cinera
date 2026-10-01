import { Search, Bookmark } from "lucide-react";

interface HeaderProps {
  onSearchClick?: () => void;
  onLibraryClick?: () => void;
}

export function Header({ onSearchClick, onLibraryClick }: HeaderProps) {
  return (
    <header className="sticky top-0 inset-x-0 z-50 px-4 md:px-12 py-2.5 md:py-3 flex items-center justify-between gap-4 border-b border-white/10 backdrop-blur-xl bg-black/60">
      <h1 className="tracking-widest font-black text-2xl sm:text-3xl md:text-[2.65rem] leading-none text-white uppercase font-serif flex-shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
        Cinera
      </h1>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Botão Minha Biblioteca (Quero Assistir / Já Assisti) */}
        <button
          type="button"
          onClick={onLibraryClick}
          aria-label="Minha Biblioteca"
          title="Minha Biblioteca"
          className="group w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/20 hover:border-white/35 text-zinc-300 hover:text-white transition-all duration-200 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <Bookmark
            size={19}
            strokeWidth={2.2}
            className="transition-transform duration-200 group-hover:scale-105"
          />
        </button>

        {/* Botão de Pesquisa */}
        <button
          type="button"
          onClick={onSearchClick}
          aria-label="Pesquisar filmes"
          className="group w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/20 hover:border-white/35 text-zinc-300 hover:text-white transition-all duration-200 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <Search
            size={19}
            strokeWidth={2.2}
            className="transition-transform duration-200 group-hover:scale-105"
          />
        </button>
      </div>
    </header>
  );
}
