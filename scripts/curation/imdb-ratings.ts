// Notas do IMDb dos filmes do catálogo, publicadas num arquivo estático (public/imdb.json) para a ficha não
// precisar consultar o OMDb a cada visita. Usa só o que o robô já buscou: lê o cache, quase nunca chama a API.
import { tmdbCached, mapLimit, omdbByImdbId, saveOmdbCache, OmdbLimitError } from "./sources.js";
import type { TMDBDetail } from "./pipeline.js";

/** IMDb ID → [nota, votos] */
export type ImdbRatings = Record<string, [number, number | null]>;

export async function buildImdbRatings(movieIds: number[]): Promise<{ ratings: ImdbRatings; missing: number[] }> {
  const ratings: ImdbRatings = {};
  const missing: number[] = [];
  await mapLimit(movieIds, 8, async (id) => {
    try {
      const detail = await tmdbCached<TMDBDetail>(`/movie/${id}?language=pt-BR`);
      const record = detail.imdb_id ? await omdbByImdbId(detail.imdb_id) : null;
      if (detail.imdb_id && record?.imdbRating != null) ratings[detail.imdb_id] = [record.imdbRating, record.imdbVotes];
      else missing.push(id);
    } catch (error) {
      if (!(error instanceof OmdbLimitError)) throw error;
      missing.push(id);
    }
  });
  saveOmdbCache();
  // Ordem estável: o arquivo não muda à toa de um dia para o outro
  const sorted = Object.fromEntries(Object.entries(ratings).sort(([a], [b]) => a.localeCompare(b)));
  return { ratings: sorted, missing: missing.sort((a, b) => a - b) };
}
