/**
 * Aquece a decodificação de uma imagem fora do momento da interação: ao rolar um carrossel, as
 * imagens novas já estão decodificadas e não competem com o movimento.
 * Usa tempo ocioso quando disponível.
 */
export function warmImageDecode(img: HTMLImageElement | null) {
  if (!img || typeof img.decode !== "function") return;
  const decode = () => {
    img.decode().catch(() => {});
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(decode, { timeout: 1500 });
  } else {
    setTimeout(decode, 200);
  }
}
