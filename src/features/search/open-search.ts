import { flushSync } from "react-dom";
import { useSearchStore } from "./use-search-store";

let searchInput: HTMLInputElement | null = null;

/** Registrado pelo SearchModal: o campo só existe enquanto o modal está aberto. */
export function registerSearchInput(node: HTMLInputElement | null) {
  searchInput = node;
}

/**
 * Abre a pesquisa e foca o campo na mesma execução do gesto do usuário.
 * O teclado virtual (iPhone/iPad e outros navegadores móveis) só abre quando o foco acontece de
 * forma síncrona dentro do toque; um foco atrasado coloca o cursor, mas o teclado não aparece.
 * `preventScroll` impede o navegador de rolar a página para "revelar" o campo, que era o que empurrava a tela.
 */
export function openSearchAndFocus() {
  flushSync(() => useSearchStore.getState().openSearch());
  searchInput?.focus({ preventScroll: true });
}
