import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Header({ searchQuery = "", onSearchChange }: HeaderProps) {
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
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 px-6 md:px-8 py-2.5 md:py-3 flex items-center justify-between gap-4 border-b backdrop-blur-xl ${
        isScrolled
          ? "bg-black/85 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
          : "bg-black/15 border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.15)]"
      }`}
    >
      {/* LOGO Cinera: Fonte ampliada, leading-none para respiro vertical perfeito e sombra composta */}
      <h1 className="tracking-widest font-black text-3xl sm:text-4xl md:text-[2.65rem] leading-none text-white uppercase font-serif flex-shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
        Cinera
      </h1>

      {/* Barra de Pesquisa estável: aparência constante e idêntica ao focar/tocar */}
      <div className="relative w-64 sm:w-80 md:w-96 flex-shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Pesquisar filmes..."
          className="w-full bg-zinc-800/80 border border-white/25 rounded-full py-2 pl-11 pr-4 text-sm md:text-base text-white placeholder:text-zinc-400 outline-none backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.3)]"
        />
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
          <Search
            size={18}
            strokeWidth={2.2}
            className="text-zinc-400"
          />
        </div>
      </div>
    </header>
  );
}
