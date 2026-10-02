interface BrandLogoProps {
  /** Ação do logo: sobe ao topo da tela em que ele está */
  onClick: () => void;
  /** Id do título, para telas que se rotulam por ele (aria-labelledby) */
  titleId?: string;
}

/**
 * Logo "Cinera" como botão de "voltar ao topo". O título (h1) envolve o botão, mantendo a
 * semântica de página, e a área de toque é ampliada sem alterar o layout.
 */
export function BrandLogo({ onClick, titleId }: BrandLogoProps) {
  return (
    <h1 id={titleId} className="flex-shrink-0 leading-none">
      <button
        type="button"
        onClick={onClick}
        aria-label="Cinera, voltar ao topo"
        className="-mx-2 -my-2 px-2 py-2 rounded-lg cursor-pointer transition-opacity duration-150 hover:opacity-85 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 tracking-widest font-black text-2xl sm:text-3xl md:text-[2.65rem] leading-none text-white uppercase font-serif select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
      >
        Cinera
      </button>
    </h1>
  );
}
