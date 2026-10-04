/**
 * Fixa em --app-vh a altura da tela no celular, para ela NÃO mudar quando a barra do navegador aparece ou some ao rolar.
 * Medidas em vh/svh podem acompanhar essa barra (depende do navegador, ex.: Firefox no iPhone): o destaque e o fundo da
 * ficha mudavam de altura a cada barra e a imagem (object-cover) dava saltos e zooms. O valor só é refeito quando a
 * largura muda (girar o aparelho).
 */
export function lockViewportHeight() {
  const root = document.documentElement;
  let lastWidth = -1;

  const apply = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    root.style.setProperty("--app-vh", `${window.innerHeight}px`);
  };

  apply();
  window.addEventListener("resize", apply);
}
