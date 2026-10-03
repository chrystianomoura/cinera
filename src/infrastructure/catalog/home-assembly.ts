import type { CatalogRowId } from "./catalog-schema";

/** Fileiras da Home na ordem de exibição (a primeira que pega um filme fica com ele). */
export const HOME_ROW_ORDER: readonly CatalogRowId[] = ["novidades", "em-alta", "aclamados", "classicos", "populares"];

/** Quantos filmes cada fileira mostra na Home. */
export const HOME_ROW_LIMIT = 20;

/**
 * Cria o filtro que garante que nenhum filme se repita entre as fileiras (nem com o destaque):
 * cada chamada devolve até `limit` filmes ainda não vistos e marca esses filmes como vistos.
 * Usado pela Home e pela verificação do catálogo, para as duas concordarem sobre o que aparece.
 */
export function createDeduper<T extends { id: number }>(excludedIds: Iterable<number> = [], limit: number = HOME_ROW_LIMIT) {
  const seen = new Set<number>(excludedIds);
  return (list?: T[]): T[] => {
    if (!list) return [];
    const result: T[] = [];
    for (const movie of list) {
      if (seen.has(movie.id)) continue;
      seen.add(movie.id);
      result.push(movie);
      if (result.length >= limit) break;
    }
    return result;
  };
}
