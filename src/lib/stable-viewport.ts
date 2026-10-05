import { isShellMode } from "@/lib/page-scroll";

/**
 * Define em --app-vh a altura da tela no celular, que o destaque e o fundo da ficha usam.
 *
 * Fora do modo "shell" (Safari, desktop, Android) a barra do navegador pode recolher e aparecer ao rolar, e medidas em
 * vh/svh podem acompanhá-la: a imagem (object-cover) dava saltos e zooms. Por isso o valor é travado e só refeito quando
 * a largura muda (girar o aparelho).
 *
 * No modo "shell" (page-scroll.ts) a página não rola pela janela, então a barra não recolhe ao rolar e a área só muda de
 * forma rara (a barra reaparece, o aparelho gira). Travar ali era um erro: se a página abria com a barra de baixo
 * recolhida e ela voltava depois, o destaque ficava uns 65px mais alto que a tela e escondia as pílulas e os botões.
 * Nesse modo a altura acompanha a tela a cada mudança.
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
    if (!isShellMode() && window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    root.style.setProperty("--app-vh", `${measureSmallViewportHeight()}px`);
  };

  apply();
  window.addEventListener("resize", apply);
}
