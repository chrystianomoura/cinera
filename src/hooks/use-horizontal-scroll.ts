import { useState, useEffect, useRef, useCallback } from "react";

interface UseHorizontalScrollOptions {
  /** Fração da largura visível a rolar por clique (ex: 0.75 para 75% da tela) */
  defaultScrollFraction?: number;
}

/**
 * Hook reutilizável de alta performance para controle de trilhos horizontais de scroll.
 * - Elimina layout shifts (reflows) cacheando medições de scroll em ref.
 * - Sincroniza visibilidade dos botões anterior/próximo via RAF sem travar a thread do compositor.
 * - Atualiza medições responsivamente ao redimensionar a janela.
 */
export function useHorizontalScroll({
  defaultScrollFraction = 0.75,
}: UseHorizontalScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const maxScrollRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const updateMeasurements = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    maxScrollRef.current = el.scrollWidth - el.clientWidth;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateMeasurements();

    let lastLeft = el.scrollLeft > 2;
    let lastRight = el.scrollLeft < maxScrollRef.current - 2;

    const syncState = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft < maxScrollRef.current - 2;
      if (left !== lastLeft) {
        lastLeft = left;
        setCanScrollLeft(left);
      }
      if (right !== lastRight) {
        lastRight = right;
        setCanScrollRight(right);
      }
    };

    let resizeTimer: number | null = null;
    const onScroll = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        syncState();
      });
    };

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        updateMeasurements();
        syncState();
      }, 100);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // Verificação inicial
    syncState();

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [updateMeasurements]);

  const scroll = useCallback(
    (direction: "left" | "right", fraction?: number) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const scrollFactor = fraction ?? defaultScrollFraction;
      const scrollAmount = container.clientWidth * scrollFactor;

      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    },
    [defaultScrollFraction]
  );

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    updateMeasurements,
  };
}
