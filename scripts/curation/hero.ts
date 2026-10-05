// Escolha do destaque: um filme de cada fileira, sempre diferente dos do dia anterior.
import type { CatalogRowId } from "../../src/infrastructure/catalog/catalog-schema.js";

/** Quantos filmes da fileira disputam o destaque (os melhores elegíveis) */
export const SHOWCASE = 8;

interface HeroMovie {
  id: number;
  title: string;
  backdropPath?: string | null;
  tagline?: string | null;
}

/**
 * Sai de uma vitrine com os primeiros filmes elegíveis de cada fileira e gira com a data (um por dia).
 * - Sempre tem imagem de fundo e tagline.
 * - Nunca repete filme no mesmo dia, nem um dos que eram destaque no dia anterior (`previous`).
 * - `blocked` lista filmes que nunca devem ser destaque (por fileira).
 */
export function pickHero<M extends HeroMovie>(
  rows: { id: CatalogRowId; movies: M[] }[],
  blocked: Record<string, number[]>,
  day: number,
  previous: { id: number }[] = [],
): M[] {
  const used = new Set<number>();
  const yesterday = new Set(previous.map((m) => m.id));
  return rows.map((row, rowIndex) => {
    const skip = new Set(blocked[row.id] ?? []);
    const showcase = row.movies
      .filter((m) => !used.has(m.id) && !yesterday.has(m.id) && !skip.has(m.id) && m.backdropPath && m.tagline?.trim())
      .slice(0, SHOWCASE);
    if (showcase.length === 0) throw new Error(`Nenhum filme da fileira "${row.id}" pode ser destaque (com imagem de fundo e tagline, e diferente do dia anterior)`);
    // O deslocamento por fileira evita que todas girem no mesmo ritmo
    const pick = showcase[(day + rowIndex * 3) % showcase.length];
    used.add(pick.id);
    return pick;
  });
}
