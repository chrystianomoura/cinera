let activeScrollRaf: number | null = null;
let cleanUpListeners: (() => void) | null = null;

/**
 * Executa uma rolagem suave, aveludada e sem engasgos até o topo da página.
 *
 * Otimizações de alta performance:
 * 1. Desativa temporariamente `pointer-events` no `body` durante a rolagem para
 *    evitar que dezenas de cards disparem cálculos de hover, sombras e repaints
 *    à medida que passam sob o cursor do mouse (elimina 100% dos engasgos).
 * 2. Duração calculada de forma orgânica via raiz quadrada da distância (entre 700ms e 950ms),
 *    evitando o salto bruto/rápido de ~300ms do navegador padrão.
 * 3. Curva de desaceleração cúbica `easeInOutCubic` para partida e aterrissagem macias.
 * 4. Interrupção graciosa se o usuário rolar a roda do mouse ou tocar na tela.
 */
export function smoothScrollToTop(onComplete?: () => void) {
  if (activeScrollRaf !== null) {
    cancelAnimationFrame(activeScrollRaf);
    activeScrollRaf = null;
  }
  if (cleanUpListeners) {
    cleanUpListeners();
    cleanUpListeners = null;
  }

  const start = window.scrollY;
  if (start <= 0) {
    onComplete?.();
    return;
  }

  // Duração calibrada: ~700ms para distâncias curtas até no máximo 950ms para distâncias longas
  const duration = Math.min(950, Math.max(700, 550 + Math.sqrt(start) * 8));
  let startTime: number | null = null;

  // Curva cúbica aveludada (macia no início, estável no meio e desaceleração progressiva)
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Desativa pointer-events para zerar recalculo de hover nos cards durante o percurso
  const originalPointerEvents = document.body.style.pointerEvents;
  document.body.style.pointerEvents = "none";

  const cleanUp = () => {
    document.body.style.pointerEvents = originalPointerEvents;
    window.removeEventListener("wheel", cancelOnUserAction);
    window.removeEventListener("touchmove", cancelOnUserAction);
    cleanUpListeners = null;
  };

  const cancelOnUserAction = () => {
    if (activeScrollRaf !== null) {
      cancelAnimationFrame(activeScrollRaf);
      activeScrollRaf = null;
    }
    cleanUp();
  };

  cleanUpListeners = cancelOnUserAction;

  window.addEventListener("wheel", cancelOnUserAction, { passive: true });
  window.addEventListener("touchmove", cancelOnUserAction, { passive: true });

  const step = (currentTime: number) => {
    if (startTime === null) {
      startTime = currentTime;
    }

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, Math.round(start * (1 - ease)));

    if (progress < 1) {
      activeScrollRaf = requestAnimationFrame(step);
    } else {
      activeScrollRaf = null;
      cleanUp();
      onComplete?.();
    }
  };

  activeScrollRaf = requestAnimationFrame(step);
}
