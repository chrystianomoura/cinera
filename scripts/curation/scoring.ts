import { getFranchiseKey } from "../../src/infrastructure/api/curation-filters.js";
import type { AwardsInfo } from "./sources.js";

/** Filme candidato com as notas das três fontes (TMDB, IMDb e crítica) já reunidas. */
export interface Candidate {
  id: number;
  title: string;
  originalTitle: string;
  year: number;
  tmdbRating: number;
  tmdbVotes: number;
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  rottenTomatoes: number | null;
  collectionId: number | null;
  collectionName: string | null;
  genres: string[];
  awards: AwardsInfo | null;
}

export interface RowConfig {
  /** Votos mínimos no IMDb: garante público amplo, não um fã-clube */
  minImdbVotes: number;
  /** Maior diferença aceita entre a nota do TMDB e a do IMDb (acima disso, nota inflada) */
  maxDivergence: number;
  /** Pontuação de consenso mínima para entrar */
  minConsensus: number;
  /** Exige nível de premiação (Oscar, crítica excepcional ou muitas premiações) para entrar */
  requirePrestige: boolean;
  /** Quantas posições iniciais valem a regra estrita de 1 filme por franquia */
  strictFranchiseBlock: number;
  /** Distância mínima, em posições, entre dois filmes da mesma franquia fora do bloco estrito */
  franchiseSpacing: number;
  /** Máximo de filmes por franquia na lista inteira */
  maxPerFranchise: number;
}

/** Média bayesiana: encolhe a nota do TMDB quando há poucos votos. */
export function tmdbBayes(rating: number, votes: number, prior = 6.5, weight = 1500): number {
  return (votes / (votes + weight)) * rating + (weight / (votes + weight)) * prior;
}

/** Nota de crítica (0 a 10) quando existe Metascore e/ou Rotten Tomatoes; senão, null. */
export function criticsScore(c: Candidate): number | null {
  const parts: number[] = [];
  if (c.metascore !== null) parts.push(c.metascore / 10);
  if (c.rottenTomatoes !== null) parts.push(c.rottenTomatoes / 10);
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
}

/** Premiações relevantes: Oscar pesa mais; o total de vitórias em festivais entra em escala logarítmica. */
export function prestigeBonus(c: Candidate): number {
  const a = c.awards;
  if (!a) return 0;
  return Math.min(
    0.6,
    0.12 * Math.min(a.oscarWins, 4) + 0.06 * Math.min(a.oscarNominations, 6) + 0.1 * Math.log10(1 + a.totalWins),
  );
}

/** Nível "digno de Oscar": Oscar ganho, várias indicações, crítica excepcional ou muitas premiações. */
export function hasPrestige(c: Candidate): boolean {
  const a = c.awards;
  const critics = criticsScore(c);
  return (
    (a !== null && (a.oscarWins >= 1 || a.oscarNominations >= 3 || a.totalWins >= 60)) ||
    (critics !== null && critics >= 9.0)
  );
}

/**
 * Pontuação de consenso (0 a 10). A base vem do público (IMDb pesa mais por ter o maior público e
 * menos manipulação, TMDB com média bayesiana). A crítica, quando existe, é só um ajuste limitado:
 * sobe um pouco o filme que a crítica adorou e desce pouco o que ela achou morno, sem nunca decidir
 * sozinha. Filme sem nota de crítica não é prejudicado.
 */
export function consensusScore(c: Candidate): number {
  if (c.imdbRating === null) return 0;
  const base = 0.6 * c.imdbRating + 0.4 * tmdbBayes(c.tmdbRating, c.tmdbVotes);
  const critics = criticsScore(c);
  const adjustment = critics === null ? 0 : Math.min(0.35, Math.max(-0.2, 0.3 * (critics - base)));
  return base + adjustment;
}

/** Motivo da exclusão, ou null se o filme passa nos critérios de qualidade. */
export function exclusionReason(c: Candidate, cfg: RowConfig): string | null {
  if (c.imdbRating === null || c.imdbVotes === null) return "sem nota do IMDb";
  if (c.imdbVotes < cfg.minImdbVotes) return `poucos votos no IMDb (${c.imdbVotes.toLocaleString("pt-BR")})`;
  const divergence = Math.abs(c.tmdbRating - c.imdbRating);
  if (divergence > cfg.maxDivergence) {
    return `nota inflada: TMDB ${c.tmdbRating.toFixed(1)} contra IMDb ${c.imdbRating.toFixed(1)}`;
  }
  const score = consensusScore(c);
  if (score < cfg.minConsensus) return `consenso baixo (${score.toFixed(2)})`;
  if (cfg.requirePrestige && !hasPrestige(c)) return "sem nível de premiação/crítica";
  return null;
}

/** Universos que o TMDB separa em coleções diferentes, mas que o usuário enxerga como uma saga só. */
const UNIVERSES: [RegExp, string][] = [
  [/senhor dos an[eé]is|lord of the rings|hobbit/i, "universo:tolkien"],
  [/batman|dark knight|cavaleiro das trevas/i, "universo:batman"],
  [/vingadores|avengers|iron man|homem de ferro|thor|capit[aã]o am[eé]rica|captain america|guardi[aã]es da gal[aá]xia|guardians of the galaxy/i, "universo:marvel"],
  [/harry potter|animais fant[aá]sticos|fantastic beasts/i, "universo:wizarding"],
  [/star wars|guerra nas estrelas/i, "universo:star-wars"],
  [/matrix/i, "universo:matrix"],
];

/** Chave de franquia: universo curado, depois coleção do TMDB, depois heurística de título. */
export function franchiseOf(c: Candidate): string {
  const haystack = `${c.collectionName ?? ""} ${c.title} ${c.originalTitle}`;
  for (const [pattern, key] of UNIVERSES) if (pattern.test(haystack)) return key;
  if (c.collectionId !== null) return `colecao:${c.collectionId}`;
  return `titulo:${getFranchiseKey(c.title, c.originalTitle)}`;
}

export interface Skipped {
  candidate: Candidate;
  reason: string;
}

/**
 * Monta a lista final: percorre os candidatos por pontuação e aplica a regra de franquias.
 * Dentro do bloco inicial, só 1 filme por franquia. Depois dele, mais um filme da mesma saga só
 * entra a pelo menos `franchiseSpacing` posições de distância do anterior, até `maxPerFranchise`.
 * Filmes adiados ficam numa fila e voltam quando a distância permite.
 */
export function buildRanking(sorted: Candidate[], cfg: RowConfig, limit: number): { picked: Candidate[]; skipped: Skipped[] } {
  const picked: Candidate[] = [];
  const skipped: Skipped[] = [];
  const lastPosition = new Map<string, number>();
  const count = new Map<string, number>();
  let waiting: Candidate[] = [];

  const accept = (c: Candidate) => {
    const key = franchiseOf(c);
    picked.push(c);
    lastPosition.set(key, picked.length - 1);
    count.set(key, (count.get(key) ?? 0) + 1);
  };

  const canAccept = (c: Candidate) => {
    const key = franchiseOf(c);
    const n = count.get(key) ?? 0;
    if (n === 0) return true;
    if (picked.length < cfg.strictFranchiseBlock) return false;
    if (n >= cfg.maxPerFranchise) return false;
    return picked.length - (lastPosition.get(key) ?? 0) >= cfg.franchiseSpacing;
  };

  for (const c of sorted) {
    if (picked.length >= limit) break;
    // Antes de tratar o próximo, devolve à lista quem estava esperando e já pode entrar
    const ready = waiting.filter(canAccept);
    for (const w of ready) {
      if (picked.length < limit && canAccept(w)) {
        accept(w);
        waiting = waiting.filter((x) => x.id !== w.id);
      }
    }
    if (picked.length >= limit) break;
    if (canAccept(c)) accept(c);
    else waiting.push(c);
  }

  for (const w of waiting) {
    if (picked.length < limit && canAccept(w)) accept(w);
  }
  for (const w of waiting) {
    if (!picked.some((p) => p.id === w.id)) {
      skipped.push({ candidate: w, reason: `franquia repetida (${franchiseOf(w).replace(/^(colecao|titulo|universo):/, "")})` });
    }
  }
  return { picked, skipped };
}
