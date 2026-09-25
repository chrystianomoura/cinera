import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface HeaderProps {
  onSearchClick?: () => void;
}

export function Header({ onSearchClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitora a rolagem para adensar o Header dinamicamente durante a navegação
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 25;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 px-4 md:px-8 py-2.5 md:py-3 flex items-center justify-between gap-4 border-b backdrop-blur-xl ${
        isScrolled
          ? "bg-black/85 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
          : "bg-black/15 border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.15)]"
      }`}
    >
      <h1 className="tracking-widest font-black text-2xl sm:text-3xl md:text-[2.65rem] leading-none text-white uppercase font-serif flex-shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
        Cinera
      </h1>

      <button
        type="button"
        onClick={onSearchClick}
        aria-label="Pesquisar filmes"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/20 hover:border-white/35 text-zinc-300 hover:text-white transition-all duration-200 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 cursor-pointer"
      >
        <Search
          size={19}
          strokeWidth={2.2}
          className="transition-transform duration-200 group-hover:scale-105"
        />
      </button>
    </header>
  );
}
