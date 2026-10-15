import { getBackdropUrl } from "../../infrastructure/api/tmdb-image-url.ts";

/**
 * Plano B das fotos do destaque, para quando não há a versão em AVIF gerada no build (navegador sem suporte a AVIF,
 * ou build sem rede para baixar as originais da TMDB).
 *
 * O `sizes` descreve a largura da FOTO INTEIRA na tela, e não a do quadro: a foto é 16:9 e o quadro do destaque não,
 * então o `object-cover` corta e a parte que aparece é uma foto bem maior que o quadro.
 * - Celular (até 767 px): o quadro é 4:5, então a foto inteira ocupa 2,22× a largura da tela; com o zoom do Ken Burns
 *   (até 1,06×) ficam 236vw.
 * - Desktop: o quadro tem no máximo 760 px de altura, logo a foto tem no mínimo 760 × 16/9 = 1351 px de largura;
 *   com o zoom, 1432 px.
 * Com `sizes` igual à largura do QUADRO (como estava antes), o navegador achava que 1170 px bastavam num iPhone e
 * esticava a w1280 mais de 2 vezes, deixando a foto borrada.
 */
export const HERO_FALLBACK_SIZES = "(max-width: 767px) 236vw, max(106vw, 1432px)";

/** Versões da foto do destaque servidas pela TMDB. O `original` tem 3840 px de largura. */
export function heroImageSources(backdropPath: string | null) {
  if (!backdropPath) return { src: "", srcSet: undefined, sizes: undefined };

  const w780 = getBackdropUrl(backdropPath, "w780");
  const w1280 = getBackdropUrl(backdropPath, "w1280");
  const original = getBackdropUrl(backdropPath, "original");

  return { src: w1280, srcSet: `${w780} 780w, ${w1280} 1280w, ${original} 3840w`, sizes: HERO_FALLBACK_SIZES };
}

/**
 * Atributos do <link rel="preload"> da primeira foto do destaque, ou null quando o catálogo não tem destaque.
 * Com a versão em AVIF (gerada no build), o preload é dela; sem ela, é o plano B, com a mesma lista e o mesmo `sizes`
 * do <img> (se um pedisse outra foto, o navegador baixaria duas vezes). O `type` faz navegadores sem AVIF ignorarem o preload.
 */
export function heroPreloadAttrs(backdropPath: string | null | undefined, avifUrl?: string) {
  if (!backdropPath) return null;

  if (avifUrl) return { rel: "preload", as: "image", type: "image/avif", href: avifUrl, fetchpriority: "high" };

  const { src, srcSet, sizes } = heroImageSources(backdropPath);
  return { rel: "preload", as: "image", href: src, imagesrcset: srcSet, imagesizes: sizes, fetchpriority: "high" };
}
