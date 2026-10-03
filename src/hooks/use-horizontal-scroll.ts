import { useState, useEffect, useRef, useCallback } from "react";

interface UseHorizontalScrollOptions {
  /** Fração da largura visível a rolar por clique (padrão: 0.75 para ~75% da tela) */
  defaultScrollFraction?: number;
  /** Limite em pixels para considerar que saiu das extremidades (padrão: 12) */
  threshold?: number;
}

/**
 * Controle da rolagem horizontal de um carrossel:
 * - A rolagem suave fica a cargo do navegador (compositor), sem animação em JavaScript
 * - Durante o deslize não há leituras de DOM nem atualizações de estado
 * - Os limites (canScrollLeft / canScrollRight) só são relidos ao iniciar e ao terminar
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
      // Durante o percurso suave acionado por seta, não lê o DOM nem atualiza estado, para a rolagem não engasgar
      if (isProgrammaticScrollRef.current) return;
      scheduleSync();
    };

    const onManualIntervention = () => {
      if (isProgrammaticScrollRef.current) {
        if (programmaticScrollTimerRef.current !== null) {
          window.clearTimeout(programmaticScrollTimerRef.current);
          programmaticScrollTimerRef.current = null;
        }
        el.style.pointerEvents = "";
        isProgrammaticScrollRef.current = false;
        targetScrollLeftRef.current = null;
        scheduleSync();
      }
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
    el.addEventListener("wheel", onManualIntervention, { passive: true });
    el.addEventListener("touchstart", onManualIntervention, { passive: true });
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
        programmaticScrollTimerRef.current = null;
      }
      if (resizeTimer) window.clearTimeout(resizeTimer);
      el.style.pointerEvents = "";
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onManualIntervention);
      el.removeEventListener("touchstart", onManualIntervention);
      window.removeEventListener("resize", onResize);
    };
  }, [node, syncState, scheduleSync]);

  const scroll = useCallback(
    (direction: "left" | "right", fraction?: number) => {
      const el = nodeRef.current;
      if (!el) return;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 0) return;

      // 1. Tenta alinhar a rolagem a cards inteiros
      const children = Array.from(el.children) as HTMLElement[];
      const firstChild = children[0];
      const secondChild = children[1];

      let cardStride = 0;
      if (firstChild && secondChild) {
        cardStride = secondChild.offsetLeft - firstChild.offsetLeft;
      } else if (firstChild) {
        cardStride = firstChild.offsetWidth;
      }

      const currentTarget =
        targetScrollLeftRef.current !== null
          ? targetScrollLeftRef.current
          : el.scrollLeft;

      let target: number;

      if (cardStride > 0 && !fraction) {
        // Alinhamento à grade de cards inteiros
        // Lê o scroll-padding-left do CSS (igual à largura do fade esquerdo por breakpoint — 0 em mobile).
        // Deve ser lido ANTES do visibleCards para reduzir o espaço útil e evitar overflow no lado direito.
        const scrollPaddingLeft = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
        const currentCardIndex = Math.round(currentTarget / cardStride);
        // Espaço útil para cards = viewport − fade. O salto encaixa sem transbordar na direita.
        const visibleCards = Math.max(1, Math.floor((el.clientWidth - scrollPaddingLeft) / cardStride));
        const nextCardIndex =
          direction === "right"
            ? currentCardIndex + visibleCards
            : currentCardIndex - visibleCards;

        const candidateTarget = nextCardIndex * cardStride;
        // Recua o alvo pelo padding → card anterior faz peek atrás do fade (coberto); novo primeiro card fica limpo.
        // Exceção: target=0 (início) mantém 0, pois o fade some quando canScrollLeft=false.
        const adjustedTarget = candidateTarget > 0
          ? Math.max(0, candidateTarget - scrollPaddingLeft)
          : 0;

        if (direction === "right") {
          // Se a sobra até o final for menor que 1.2 cards, aterrissa no limite máximo
          if (maxScroll - adjustedTarget < cardStride * 1.2) {
            target = maxScroll;
          } else {
            target = Math.min(maxScroll, adjustedTarget);
          }
        } else {
          if (adjustedTarget < cardStride * 1.2) {
            target = 0;
          } else {
            target = Math.max(0, adjustedTarget);
          }
        }
      } else {
        const scrollFactor = fraction ?? defaultScrollFraction;
        const scrollDelta = Math.round(el.clientWidth * scrollFactor);
        const rawTarget = currentTarget + (direction === "left" ? -scrollDelta : scrollDelta);

        if (direction === "right") {
          const remainingAfter = maxScroll - rawTarget;
          target = remainingAfter > 0 && remainingAfter < 200 ? maxScroll : Math.min(maxScroll, rawTarget);
        } else {
          target = rawTarget > 0 && rawTarget < 200 ? 0 : Math.max(0, rawTarget);
        }
      }

      targetScrollLeftRef.current = target;
      isProgrammaticScrollRef.current = true;

      // Desativa o ponteiro nos cards durante o percurso, para o hover não disparar repinturas
      el.style.pointerEvents = "none";

      const handleScrollEnd = () => {
        if (programmaticScrollTimerRef.current !== null) {
          window.clearTimeout(programmaticScrollTimerRef.current);
          programmaticScrollTimerRef.current = null;
        }
        el.removeEventListener("scrollend", handleScrollEnd);
        el.style.pointerEvents = "";
        isProgrammaticScrollRef.current = false;
        targetScrollLeftRef.current = null;
        scheduleSync();
      };

      if (programmaticScrollTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }

      // Ouve o evento nativo scrollend emitido pelo compositor da GPU assim que a física suave desacelera a zero
      el.addEventListener("scrollend", handleScrollEnd, { once: true });
      // Fallback timer de segurança para navegadores que não disparam scrollend
      programmaticScrollTimerRef.current = window.setTimeout(handleScrollEnd, 700);

      // Executa no compositor em C++ da GPU
      el.scrollTo({
        left: target,
        behavior: "smooth",
      });
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
