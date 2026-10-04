/**
 * Fixa em --app-vh a altura MENOR da tela no celular (com as barras do navegador visíveis), e a mantém quando a barra
 * aparece ou some ao rolar. Medidas em vh/svh podem acompanhar essa barra (depende do navegador, ex.: Firefox no
 * iPhone): o destaque e o fundo da ficha mudavam de altura a cada barra e a imagem (object-cover) dava saltos e zooms.
 * O valor só é refeito quando a largura muda (girar o aparelho).
 *
 * Mede com um elemento de 100svh, e não com window.innerHeight: em alguns navegadores o innerHeight na abertura é a
 * altura GRANDE (barras recolhidas) e o destaque passava a ocupar a tela inteira, sem deixar ver a fileira de baixo.
 */
function measureSmallViewportHeight(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const svh = probe.getBoundingClientRect().height;
  probe.remove();
  // Sem suporte a svh a altura medida é 0: cai para o innerHeight
  return svh > 0 ? Math.min(svh, window.innerHeight) : window.innerHeight;
}

export function lockViewportHeight() {
  const root = document.documentElement;
  let lastWidth = -1;

  const apply = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    root.style.setProperty("--app-vh", `${measureSmallViewportHeight()}px`);
  };

  apply();
  window.addEventListener("resize", apply);
}
