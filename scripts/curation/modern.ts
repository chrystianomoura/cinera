// Regras compartilhadas pelas fileiras de filmes recentes (Em Alta e Novidades): lançamentos têm
// pouco público no IMDb e notas instáveis, então a qualidade é medida com mais cautela.
import { tmdbCached, saveTmdbCache, omdbByImdbId, saveOmdbCache, mapLimit, OmdbLimitError } from "./sources.js";
import { type Candidate, type RowConfig, tmdbBayes, consensusScore } from "./scoring.js";
import type { TMDBDetail } from "./pipeline.js";

export const MODERN_CONFIG: RowConfig = {
  minImdbVotes: 0,
  maxDivergence: 1.2,
  minConsensus: 6.8,
  requirePrestige: false,
  strictFranchiseBlock: 20,
  franchiseSpacing: 10,
  maxPerFranchise: 2,
};
export const MIN_TMDB_VOTES = 200;
/** Com público pequeno (lançamento recente) o IMDb ainda oscila: só vale a partir daqui */
export const MIN_IMDB_VOTES = 5_000;
/** A divergência TMDB × IMDb já vale com público menor: é o sinal mais barato de nota inflada */
const MIN_IMDB_VOTES_FOR_DIVERGENCE = 300;
export const QUALITY_BEST = 8.5;
/** Quantas posições iniciais exigem nota do IMDb */
export const SHOWCASE_SIZE = 10;

export const fmt = (n: number | null, d = 1) => (n === null ? "—" : n.toFixed(d));

/** Qualidade 0–10: consenso IMDb+TMDB quando há público no IMDb; senão, só o TMDB (bayesiano leve). */
export function quality(c: Candidate): number {
  if (c.imdbRating !== null && (c.imdbVotes ?? 0) >= MIN_IMDB_VOTES) return consensusScore(c);
  // Sem IMDb confiável, a nota só do TMDB não passa de 8,0 (evita nota inflada por poucos votantes)
  return Math.min(8.0, tmdbBayes(c.tmdbRating, c.tmdbVotes, 6.5, 300));
}

/** Qualidade normalizada de 0 a 1 entre o piso e o teto da fileira. */
export function qualityNorm(c: Candidate): number {
  return Math.min(1, Math.max(0, (quality(c) - MODERN_CONFIG.minConsensus) / (QUALITY_BEST - MODERN_CONFIG.minConsensus)));
}

export function modernExclusion(c: Candidate, d: TMDBDetail, today: string): string | null {
  if (!d.release_date || d.release_date > today) return "ainda não lançado";
  if (!d.poster_path || !d.backdrop_path) return "sem pôster ou imagem de fundo";
  if (c.tmdbVotes < MIN_TMDB_VOTES) return `poucos votos no TMDB (${c.tmdbVotes})`;
  if (c.imdbRating !== null && (c.imdbVotes ?? 0) >= MIN_IMDB_VOTES_FOR_DIVERGENCE) {
    const divergence = Math.abs(c.tmdbRating - c.imdbRating);
    if (divergence > MODERN_CONFIG.maxDivergence) return `nota inflada: TMDB ${fmt(c.tmdbRating)} contra IMDb ${fmt(c.imdbRating)}`;
  }
  // Nota do IMDb existe mas o público ainda é pequeno demais para confiar nela
  if ((c.imdbRating !== null || c.imdbVotes !== null) && (c.imdbVotes ?? 0) < MIN_IMDB_VOTES) {
    return `poucos votos no IMDb (${(c.imdbVotes ?? 0).toLocaleString("pt-BR")})`;
  }
  const q = quality(c);
  if (q < MODERN_CONFIG.minConsensus) return `qualidade baixa (${q.toFixed(2)})`;
  return null;
}

/** Vitrine: as primeiras posições só aceitam filme com nota do IMDb confiável; o resto segue por pontuação. */
export function showcaseOrder(sortedEligible: Candidate[]): Candidate[] {
  const hasImdb = (c: Candidate) => c.imdbRating !== null && (c.imdbVotes ?? 0) >= MIN_IMDB_VOTES;
  const showcase = sortedEligible.filter(hasImdb).slice(0, SHOWCASE_SIZE);
  return [...showcase, ...sortedEligible.filter((c) => !showcase.includes(c))];
}

/** Detalhes do TMDB + notas do OMDb (só de quem tem chance de passar) transformados em candidatos. */
export async function loadCandidates(ids: number[]): Promise<{ details: TMDBDetail[]; candidates: Candidate[] }> {
  console.log("   Buscando detalhes (coleção e IMDb ID)...");
  const details = await mapLimit(ids, 8, (id) => tmdbCached<TMDBDetail>(`/movie/${id}?language=pt-BR`));
  saveTmdbCache();

  console.log("   Notas do IMDb e da crítica (OMDb, só para quem tem chance de passar)...");
  let omdbStopped = false;
  const omdb = await mapLimit(details, 4, async (d) => {
    if (!d.imdb_id || omdbStopped || d.vote_average < 6.5 || d.vote_count < MIN_TMDB_VOTES) return null;
    try {
      return await omdbByImdbId(d.imdb_id);
    } catch (error) {
      if (error instanceof OmdbLimitError) {
        omdbStopped = true;
        return null;
      }
      throw error;
    }
  });
  saveOmdbCache();
  if (omdbStopped) console.log("   ATENÇÃO: o limite de consultas do OMDb foi atingido; rode de novo para completar.");

  const candidates: Candidate[] = details.map((d, i) => ({
    id: d.id,
    title: d.title,
    originalTitle: d.original_title,
    year: Number(d.release_date?.slice(0, 4)),
    tmdbRating: d.vote_average,
    tmdbVotes: d.vote_count,
    imdbRating: omdb[i]?.imdbRating ?? null,
    imdbVotes: omdb[i]?.imdbVotes ?? null,
    metascore: omdb[i]?.metascore ?? null,
    rottenTomatoes: omdb[i]?.rottenTomatoes ?? null,
    collectionId: d.belongs_to_collection?.id ?? null,
    collectionName: d.belongs_to_collection?.name ?? null,
    genres: d.genres.map((g) => g.name),
    awards: omdb[i]?.awards ?? null,
  }));
  return { details, candidates };
}
