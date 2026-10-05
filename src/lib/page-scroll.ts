/**
 * Rolagem da página.
 *
 * No iPhone, em navegadores que têm barras fora da página (Chrome, Firefox, Edge, Opera, DuckDuckGo...), a barra de baixo
 * recolhe ao rolar e volta ao rolar para cima, e cada passo da animação REDIMENSIONA a área da página: o motor refaz o
 * posicionamento, a árvore de rolagem e a pintura de tudo, e páginas pesadas (como a Home) engasgam.
 *
 * No Safari não há esse redimensionamento, mas rolar a janela rápido deixava as fileiras "se montando" (blocos da página
 * ainda sem pintar). Rolar uma área interna evita isso, então o Safari também usa o modo shell.
 *
 * Em todo o iOS a rolagem deixa de ser da janela e passa a ser de uma área interna (#root, modo "shell"): como o
 * documento não rola, a barra não recolhe e a área da página nunca muda. Todo o código que lê ou controla a rolagem da
 * página passa por aqui, para funcionar nos dois modos.
 *
 * `?shell=1` força o modo (e lembra a escolha), `?shell=0` desliga e esquece.
 */

const STORAGE_KEY = "cinera:shell";

interface ShellDecisionInput {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  search: string;
  stored: string | null;
}

export function shouldUseShell({ userAgent, platform, maxTouchPoints, search, stored }: ShellDecisionInput): boolean {
  const forced = new URLSearchParams(search).get("shell");
  if (forced === "1") return true;
  if (forced === "0") return false;
  if (stored === "1") return true;

  // O iPad em modo desktop se apresenta como Mac, mas tem toque
  const isIOS = /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  return isIOS;
}

let shell = false;

/** Decide o modo, uma vez, antes de a página desenhar. Chamar antes de renderizar o app. */
export function initPageScroll(): boolean {
  let stored: string | null = null;
  try {
    const forced = new URLSearchParams(window.location.search).get("shell");
    if (forced === "1") window.localStorage.setItem(STORAGE_KEY, "1");
    else if (forced === "0") window.localStorage.removeItem(STORAGE_KEY);
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Sem armazenamento (navegação privada): vale só a identificação do navegador
  }

  shell = shouldUseShell({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    search: window.location.search,
    stored,
  });
  document.documentElement.classList.toggle("shell", shell);
  return shell;
}

export const isShellMode = () => shell;

const scrollRoot = () => document.getElementById("root") as HTMLElement;

/** Posição atual da rolagem da página */
export const getScrollY = () => (shell ? scrollRoot().scrollTop : window.scrollY);

export function scrollPageTo(options: ScrollToOptions) {
  if (shell) scrollRoot().scrollTo(options);
  else window.scrollTo(options);
}

/** Posição exata, sem animação (usado quadro a quadro) */
export function setScrollY(top: number) {
  if (shell) scrollRoot().scrollTop = top;
  else window.scrollTo(0, top);
}

/** Ouve a rolagem da página; devolve a função que para de ouvir. */
export function addPageScrollListener(
  type: "scroll" | "scrollend",
  handler: () => void,
  options?: AddEventListenerOptions,
): () => void {
  const target: EventTarget = shell ? scrollRoot() : window;
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler);
}

let locks = 0;
let release: (() => void) | null = null;

/**
 * Trava a rolagem da página (ficha, biblioteca e pesquisa abertas). Pode ser chamada por vários ao mesmo tempo: a rolagem
 * só volta quando o último soltar. Devolve a função que solta.
 */
export function lockPageScroll(): () => void {
  if (locks === 0) {
    if (shell) {
      const root = scrollRoot();
      const previous = root.style.overflowY;
      root.style.overflowY = "hidden";
      release = () => {
        root.style.overflowY = previous;
      };
    } else {
      const body = document.body;
      const previous = body.style.overflow;
      body.style.overflow = "hidden";
      release = () => {
        body.style.overflow = previous;
      };
    }
  }
  locks++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0) {
      release?.();
      release = null;
    }
  };
}
