// Endereço da imagem de fundo do TMDB, sem nenhuma dependência (nem do navegador nem do Vite): o vite.config.ts roda
// no Node e precisa dele para montar o preload da foto do destaque (veja features/hero/hero-image.ts).

/**
 * Função utilitária para obter o URL do backdrop (imagem de fundo) do filme no TMDB.
 */
export const getBackdropUrl = (
  path: string | null,
  size: 'w780' | 'w1280' | 'original' = 'original'
): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};
