import { useState, useEffect, useRef, useCallback } from "react";

interface UseHorizontalScrollOptions {
  /** Fração da largura visível a rolar por clique (padrão: 0.75 para ~75% da tela) */
  defaultScrollFraction?: number;
  /** Duração em ms da rolagem suave (padrão: 820ms para um deslize relaxante e aveludado) */
  scrollDuration?: number;
  /** Limite em pixels para considerar que saiu das extremidades (padrão: 8) */
  threshold?: number;
}

/**
 * Hook para controle de rolagem horizontal fluida com:
 * - Rolagem suave acionada por RAF com curva easeInOutCubic
 * - Desativação temporária de pointer-events durante animação de setas
 * - Detecção de limites (canScrollLeft / canScrollRight) para controle de fades e setas
 */
export function useHorizontalScroll({
  defaultScrollFraction = 0.75,
  scrollDuration = 820,
  threshold = 8,
}: UseHorizontalScrollOptions = {}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    nodeRef.current = el;
    setNode(el);
  }, []);

  const maxScrollRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const animRafRef = useRef<number | null>(null);
  const targetScrollLeftRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  const updateMeasurements = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    maxScrollRef.current = Math.max(0, el.scrollWidth - el.clientWidth);
  }, []);

  const syncState = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    const max = maxScrollRef.current || Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft > threshold;
    const right = el.scrollLeft < max - threshold;

    setCanScrollLeft((prev) => (prev !== left ? left : prev));
    setCanScrollRight((prev) => (prev !== right ? right : prev));
  }, [threshold]);

  useEffect(() => {
    const el = node;
    if (!el) return;

    updateMeasurements();
    syncState();
    const initialRaf = requestAnimationFrame(syncState);
    const timer = window.setTimeout(() => {
      updateMeasurements();
      syncState();
    }, 60);

    let resizeTimer: number | null = null;

    const onScroll = () => {
      // Durante a rolagem acionada pelas setas, ignoramos os eventos intermediários
      // para não causar reflows ou re-renders no meio da animação.
      if (isProgrammaticScrollRef.current) return;

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

    // Se o usuário interagir diretamente com trackpad ou toque durante o percurso,
    // cancela imediatamente a animação programática e devolve o controle instantâneo
    const onManualIntervention = () => {
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
      targetScrollLeftRef.current = null;
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        el.style.pointerEvents = "";
        syncState();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onManualIntervention, { passive: true });
    el.addEventListener("touchstart", onManualIntervention, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(initialRaf);
      window.clearTimeout(timer);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      el.style.pointerEvents = "";
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onManualIntervention);
      el.removeEventListener("touchstart", onManualIntervention);
      window.removeEventListener("resize", onResize);
    };
  }, [node, updateMeasurements, syncState]);

  const scroll = useCallback(
    (direction: "left" | "right", fraction?: number) => {
      const el = nodeRef.current;
      if (!el) return;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 0) return;

      const scrollFactor = fraction ?? defaultScrollFraction;
      const scrollDelta = Math.round(el.clientWidth * scrollFactor);
      if (scrollDelta <= 0) return;

      // Base inteligente: se já estiver rolando por cliques rápidos, encadeia a partir do alvo
      const currentTarget =
        targetScrollLeftRef.current !== null
          ? targetScrollLeftRef.current
          : el.scrollLeft;

      const newTarget = Math.max(
        0,
        Math.min(
          maxScroll,
          currentTarget + (direction === "left" ? -scrollDelta : scrollDelta)
        )
      );

      targetScrollLeftRef.current = newTarget;
      const startLeft = el.scrollLeft;
      const distance = newTarget - startLeft;

      if (Math.abs(distance) < 2) {
        targetScrollLeftRef.current = null;
        return;
      }

      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }

      isProgrammaticScrollRef.current = true;
      // Previne disparos de hover acidentais nos cards durante a rolagem
      el.style.pointerEvents = "none";

      const duration = scrollDuration;
      let startTime: number | null = null;

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (currentTime: number) => {
        if (startTime === null) {
          startTime = currentTime;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = easeInOutCubic(progress);

        el.scrollLeft = Math.round(startLeft + distance * ease);

        if (progress < 1) {
          animRafRef.current = requestAnimationFrame(step);
        } else {
          el.scrollLeft = newTarget;
          animRafRef.current = null;
          targetScrollLeftRef.current = null;
          el.style.pointerEvents = "";
          isProgrammaticScrollRef.current = false;
          syncState();
        }
      };

      animRafRef.current = requestAnimationFrame(step);
    },
    [defaultScrollFraction, scrollDuration, syncState]
  );

  return {
    containerRef,
    containerElement: node,
    canScrollLeft,
    canScrollRight,
    scroll,
    updateMeasurements,
  };
}
