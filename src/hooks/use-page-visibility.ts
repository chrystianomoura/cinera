import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

const getSnapshot = () => document.visibilityState === "visible";
const getServerSnapshot = () => true;

/**
 * Indica se a aba está visível para o usuário.
 * Vira false ao trocar de aba, minimizar o navegador ou bloquear a tela.
 */
export function usePageVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
