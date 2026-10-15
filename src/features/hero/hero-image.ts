import { getBackdropUrl } from "../../infrastructure/api/tmdb-client";

/** Largura que o destaque ocupa na tela. */
export const HERO_IMAGE_SIZES = "min(100vw, 1280px)";

/**
 * Versões da foto do destaque que o <img> do HeroFeatured oferece ao navegador.
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
