import { getBackdropUrl } from "../../infrastructure/api/tmdb-image-url.ts";

/** Largura que o destaque ocupa na tela. O preload do index.html repete exatamente este valor. */
export const HERO_IMAGE_SIZES = "min(100vw, 1280px)";

/**
 * Fonte única das versões da foto do destaque: o <img> do HeroFeatured e o <link rel="preload"> que o build coloca
 * no index.html usam esta função. Se um pedisse outro tamanho ou outra lista, o navegador baixaria a foto duas vezes.
 *
 * Para no w1280: o `original` pesava de 0,6 a 1,5 MB por foto e era o escolhido em telas retina (a foto fica sob
 * um degradê escuro e com zoom animado, então a perda de nitidez quase não aparece).
 */
export function heroImageSources(backdropPath: string | null) {
  if (!backdropPath) return { src: "", srcSet: undefined, sizes: undefined };

  const w780 = getBackdropUrl(backdropPath, "w780");
  const w1280 = getBackdropUrl(backdropPath, "w1280");

  return { src: w1280, srcSet: `${w780} 780w, ${w1280} 1280w`, sizes: HERO_IMAGE_SIZES };
}

/** Atributos do <link rel="preload"> da primeira foto do destaque, ou null quando o catálogo não tem destaque. */
export function heroPreloadAttrs(backdropPath: string | null | undefined) {
  if (!backdropPath) return null;

  const { src, srcSet, sizes } = heroImageSources(backdropPath);
  return { rel: "preload", as: "image", href: src, imagesrcset: srcSet, imagesizes: sizes, fetchpriority: "high" };
}
