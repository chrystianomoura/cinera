import { useState, useEffect, useRef, useCallback } from "react";

interface UseHorizontalScrollOptions {
  /** Fração da largura visível a rolar por clique (padrão: 0.75 para ~75% da tela) */
  defaultScrollFraction?: number;
  /** Limite em pixels para considerar que saiu das extremidades (padrão: 12) */
  threshold?: number;
}

/**
 * Hook de alto desempenho para controle de rolagem horizontal:
 * - Rolagem suave delegada 100% à thread do compositor nativo da GPU do navegador
 * - Silenciamento total de recálculos de estado e DOM durante o deslize (Zero Layout Thrashing)
 * - Leituras amortecidas de limites (canScrollLeft / canScrollRight) apenas ao iniciar/terminar
 */
export function useHorizontalScroll({
  defaultScrollFraction = 0.75,
  threshold = 12,
}: UseHorizontalScrollOptions = {}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    nodeRef.current = el;
    setNode(el);
  }, []);

  const rafIdRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const targetScrollLeftRef = useRef<number | null>(null);
  const programmaticScrollTimerRef = useRef<number | null>(null);

  const syncState = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;

    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft > threshold;
    const right = el.scrollLeft < max - threshold;

    setCanScrollLeft((prev) => (prev !== left ? left : prev));
    setCanScrollRight((prev) => (prev !== right ? right : prev));
  }, [threshold]);

  const scheduleSync = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      syncState();
      rafIdRef.current = null;
    });
  }, [syncState]);

  useEffect(() => {
    const el = node;
    if (!el) return;

    syncState();
    const timer = window.setTimeout(syncState, 60);

    let resizeTimer: number | null = null;

    const onScroll = () => {
      // Durante o percurso suave acionado por seta, silencia completamente
      // leituras de DOM e setStates para garantir 120 FPS cravados sem engasgo!
      if (isProgrammaticScrollRef.current) return;
      scheduleSync();
    };

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(syncState, 100);
    };

    // ResizeObserver para detectar redimensionamento de viewport/layout
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        scheduleSync();
      });
      resizeObserver.observe(el);
    }

    // MutationObserver para detectar adição/remoção de filhos dinâmicos
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        scheduleSync();
      });
      mutationObserver.observe(el, { childList: true, subtree: false });
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (programmaticScrollTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
      if (resizeTimer) window.clearTimeout(resizeTimer);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [node, syncState, scheduleSync]);

  const scroll = useCallback(
    (direction: "left" | "right", fraction?: number) => {
      const el = nodeRef.current;
      if (!el) return;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 0) return;

      const scrollFactor = fraction ?? defaultScrollFraction;
      const scrollDelta = Math.round(el.clientWidth * scrollFactor);
      if (scrollDelta <= 0) return;

      // Se já houver um deslocamento em curso, soma ao alvo anterior para resposta ágil e contínua
      const currentTarget =
        targetScrollLeftRef.current !== null
          ? targetScrollLeftRef.current
          : el.scrollLeft;

      const rawTarget = currentTarget + (direction === "left" ? -scrollDelta : scrollDelta);

      // Se ao rolar para a direita a sobra restante até o final for menor que 1.4x a largura de um card (~180px),
      // faz aterrissagem direta no limite máximo, evitando que o usuário precise dar um clique extra só para 1 item!
      let target: number;
      if (direction === "right") {
        const remainingAfter = maxScroll - rawTarget;
        if (remainingAfter > 0 && remainingAfter < 200) {
          target = maxScroll;
        } else {
          target = Math.min(maxScroll, rawTarget);
        }
      } else {
        if (rawTarget > 0 && rawTarget < 200) {
          target = 0;
        } else {
          target = Math.max(0, rawTarget);
        }
      }

      targetScrollLeftRef.current = target;
      isProgrammaticScrollRef.current = true;

      // Executa no compositor em C++ da GPU
      el.scrollTo({
        left: target,
        behavior: "smooth",
      });

      if (programmaticScrollTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }

      // Ao completar aterrissagem, desliga a trava programática e atualiza os botões
      programmaticScrollTimerRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        targetScrollLeftRef.current = null;
        scheduleSync();
      }, 420);
    },
    [defaultScrollFraction, scheduleSync]
  );

  return {
    containerRef,
    containerElement: node,
    canScrollLeft,
    canScrollRight,
    scroll,
    updateMeasurements: syncState,
  };
}
