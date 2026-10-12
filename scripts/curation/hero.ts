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

/** Por quantos dias um filme que foi destaque fica de fora (7 = só volta depois de uma semana) */
export const HERO_COOLDOWN_DAYS = 7;

export interface HeroHistoryEntry {
  day: number;
  ids: number[];
}

/**
 * Atualiza o histórico com o destaque de hoje. Refazer o mesmo dia troca a entrada de hoje em vez de duplicar.
 * `excluded` são os ids que o destaque de hoje não pode repetir (os dos últimos `HERO_COOLDOWN_DAYS` dias). O histórico guarda esses dias mais o de hoje.
 */
export function updateHeroHistory(history: HeroHistoryEntry[], day: number, todayIds: number[]) {
  const past = history.filter((e) => e.day < day).slice(-HERO_COOLDOWN_DAYS);
  return { excluded: past.flatMap((e) => e.ids), history: [...past, { day, ids: todayIds }].slice(-(HERO_COOLDOWN_DAYS + 1)) };
}

/**
 * Sai de uma vitrine com os primeiros filmes elegíveis de cada fileira e gira com a data (um por dia).
 * - Sempre tem imagem de fundo e tagline.
 * - Nunca repete filme no mesmo dia, nem um dos `previous` (destaques dos últimos dias).
 * - `blocked` lista filmes que nunca devem ser destaque (por fileira).
 */
export function pickHero<M extends HeroMovie>(
  rows: { id: CatalogRowId; movies: M[] }[],
  blocked: Record<string, number[]>,
  day: number,
  previous: { id: number }[] = [],
): M[] {
  const used = new Set<number>();
  const recent = new Set(previous.map((m) => m.id));
  return rows.map((row, rowIndex) => {
    const skip = new Set(blocked[row.id] ?? []);
    const showcase = row.movies
      .filter((m) => !used.has(m.id) && !recent.has(m.id) && !skip.has(m.id) && m.backdropPath && m.tagline?.trim())
      .slice(0, SHOWCASE);
    if (showcase.length === 0) throw new Error(`Nenhum filme da fileira "${row.id}" pode ser destaque (com imagem de fundo e tagline, e fora dos destaques recentes)`);
    // O deslocamento por fileira evita que todas girem no mesmo ritmo
    const pick = showcase[(day + rowIndex * 3) % showcase.length];
    used.add(pick.id);
    return pick;
  });
}
