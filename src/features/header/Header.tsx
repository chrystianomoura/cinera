import { Search, Bookmark } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface HeaderProps {
  onSearchClick?: () => void;
  onLibraryClick?: () => void;
  onLogoClick: () => void;
}

export function Header({ onSearchClick, onLibraryClick, onLogoClick }: HeaderProps) {
  return (
    <>
    {/* fixed + espaçador, e não sticky: no iPhone o sticky do cabeçalho fazia o WebKit perder a rolagem horizontal das pílulas */}
    <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-12 header-bar flex items-center justify-between gap-4 border-b border-white/10 backdrop-blur-xl bg-black/60">
      <BrandLogo onClick={onLogoClick} />

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
    <div aria-hidden="true" className="header-bar" />
    </>
  );
}
