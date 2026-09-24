import { useState, useEffect, useRef, useCallback } from "react";
import { smoothScrollToTop } from "@/lib/smooth-scroll";

/**
 * Hook para gerenciar a visibilidade e o acionamento de botões de retorno ao topo.
 * - Monitora a rolagem da janela com requestAnimationFrame para evitar re-renderizações a cada pixel.
 * - Aciona a rolagem suave amortecida sem engasgos (pointer-events desativados temporariamente).
 */
export function useScrollTopButton(threshold: number = 400) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isOver = window.scrollY > threshold;
          if (isOver !== isVisibleRef.current) {
            isVisibleRef.current = isOver;
            setShowScrollTop(isOver);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    smoothScrollToTop();
  }, []);

  return {
    showScrollTop,
    scrollToTop,
  };
}
