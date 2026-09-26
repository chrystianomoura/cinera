import type { Movie } from "@/domain";
import { fetchFromTMDB, isTmdbConfigured } from "../api/tmdb-client";
import { mapTMDBMovie } from "../api/tmdb-mappers";
import { moviesMock } from "../mock/movies.mock";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../api/tmdb-types";

/**
 * Normaliza strings removendo acentos, pontuações e excesso de espaços.
 */
export function normalizeSearchString(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Remove artigos e preposições iniciais para desfragmentar buscas por franquias
 * (ex: "os vingadores" -> "vingadores", "o poderoso chefao" -> "poderoso chefao").
 */
export function stripLeadingArticles(text: string): string {
  return text
    .replace(/^(\b(o|a|os|as|um|uma|uns|umas|the|an)\b\s*)+/i, "")
    .trim();
}

/**
 * Calcula a distância de Levenshtein entre duas palavras (matemática pura, zero IFs manuais).
 * Mede o número mínimo de inserções, deleções e substituições de letras.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Extrai eventual ano de 4 dígitos informado na query (ex: "Matrix 1999" -> ano 1999).
 */
function extractYear(query: string): { cleanQuery: string; year: number | null } {
  const yearMatch = query.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) {
    return { cleanQuery: query.trim(), year: null };
  }

  const year = parseInt(yearMatch[1], 10);
  const cleanQuery = query.replace(yearMatch[0], "").replace(/\s+/g, " ").trim();
  return { cleanQuery: cleanQuery.length > 0 ? cleanQuery : query.trim(), year };
}

/**
 * Vocabulário dos títulos e termos mais frequentes para o algoritmo de Levenshtein (Fuzzy).
 */
const COMMON_CINEMA_TERMS = [
  "batman",
  "vingadores",
  "avengers",
  "spider man",
  "homem aranha",
  "oppenheimer",
  "interstellar",
  "interestelar",
  "matrix",
  "matilda",
  "gladiador",
  "avatar",
  "coringa",
  "joker",
  "titanic",
  "barbie",
  "senhor dos aneis",
  "harry potter",
  "star wars",
  "poderoso chefao",
];

/**
 * Tenta corrigir matematicamente erros de digitação (typos) calculando Levenshtein <= 2.
 */
function findFuzzyCorrection(query: string): string | null {
  const normalized = normalizeSearchString(query);
  if (normalized.length < 4) return null;

  let bestMatch: string | null = null;
  let minDistance = 3; // Limite de tolerância estrito (máximo 2 trocas)

  for (const term of COMMON_CINEMA_TERMS) {
    const dist = levenshteinDistance(normalized, term);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = term;
    }
  }

  return bestMatch;
}

export interface SearchMoviesResult {
  movies: Movie[];
  correctedQuery?: string;
}

/**
 * Filtra filmes garantindo que pelo menos um dos termos principais da busca
 * esteja visível no título em português ou no título original do filme.
 * Elimina falsos-positivos onde o TMDB retornou match apenas por aliases ou traduções ocultas.
 */
function filterByVisibleTokens(movies: TMDBMovieRaw[], query: string): TMDBMovieRaw[] {
  const normQuery = normalizeSearchString(query);
  const tokens = normQuery.split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return movies;

  return movies.filter((m) => {
    const titleNorm = normalizeSearchString(m.title || "");
    const origNorm = normalizeSearchString(m.original_title || "");
    return tokens.some((token) => titleNorm.includes(token) || origNorm.includes(token));
  });
}

/**
 * Tenta segmentar palavras coladas quando a busca original retorna 0 resultados.
 * Ex: "jogosmortais" -> testa partições inteligentes ("jogos mortais", etc.).
 */
async function findWordSegmentationSplit(
  word: string,
  yearParam: string,
  signal?: AbortSignal
): Promise<{ candidate: string; results: TMDBMovieRaw[]; topVotes: number } | null> {
  const clean = word.toLowerCase().trim();
  // Só aplica para palavras únicas contínuas entre 6 e 25 caracteres
  if (clean.includes(" ") || clean.length < 6 || clean.length > 25) {
    return null;
  }

  // Gera partições com prefixo e sufixo de no mínimo 3 caracteres
  const candidates: string[] = [];
  for (let i = 3; i <= clean.length - 3; i++) {
    candidates.push(`${clean.slice(0, i)} ${clean.slice(i)}`);
  }

  if (candidates.length === 0) return null;

  try {
    const promises = candidates.map(async (cand) => {
      try {
        const path = `/search/movie?query=${encodeURIComponent(cand)}&language=pt-BR&include_adult=false${yearParam}`;
        const data = await fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(path, signal);
        const valid = (data.results || []).filter((m) => {
          const hasPoster = Boolean(m.poster_path);
          const isReleased = Boolean(m.release_date && new Date(m.release_date).getTime() <= Date.now());
          return hasPoster && isReleased;
        });

        const topVotes = valid.length > 0 ? Math.max(...valid.map((m) => m.vote_count || 0)) : 0;
        return { candidate: cand, count: valid.length, topVotes, results: valid };
      } catch {
        return { candidate: cand, count: 0, topVotes: 0, results: [] };
      }
    });

    const evaluated = await Promise.all(promises);
    evaluated.sort((a, b) => b.topVotes - a.topVotes);

    const best = evaluated[0];
    if (best && best.count > 0 && best.topVotes >= 10) {
      return { candidate: best.candidate, results: best.results, topVotes: best.topVotes };
    }
  } catch {
    // Ignora cancelamentos de busca
  }

  return null;
}

/**
 * Serviço de Busca Global do Cinera (Pilar 1 - Inteligência do Motor).
 * - Sanitização e corte estrito em 80 caracteres
 * - Limpeza de artigos iniciais ("os vingadores" -> busca "vingadores")
 * - Filtro de filmes não lançados e sem pôster
 * - Proteção de segmentação de espaços ("jogosmortais" -> "jogos mortais")
 * - Filtro de integridade visual de tokens (elimina filmes fantasmas do TMDB)
 * - Algoritmo Levenshtein para auto-recuperação de typos
 * - Ranking refinado com prioridade para match exato e franquias cronológicas (Top 8)
 */
export async function searchCineraMovies(
  rawQuery: string,
  signal?: AbortSignal
): Promise<SearchMoviesResult> {
  // 1. Sanitização estrita
  const sanitized = rawQuery.slice(0, 80).replace(/[\r\n\t]/g, " ").trim();
  if (sanitized.length < 2) {
    return { movies: [] };
  }

  const { cleanQuery, year } = extractYear(sanitized);

  // 2. Normalização e desarticulação inicial ("os vingadores" -> "vingadores")
  const strippedArticle = stripLeadingArticles(cleanQuery);
  const searchTerm = strippedArticle.length >= 2 ? strippedArticle : cleanQuery;
  const normalizedQuery = normalizeSearchString(searchTerm);
  const now = Date.now();

  // 3. Execução contra a API oficial de filmes do TMDB (/search/movie)
  if (isTmdbConfigured()) {
    try {
      const yearParam = year ? `&primary_release_year=${year}` : "";
      const path = `/search/movie?query=${encodeURIComponent(searchTerm)}&language=pt-BR&include_adult=false${yearParam}`;

      const data = await fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(path, signal);

      // Filtro rigoroso de qualidade:
      // - Pôster obrigatório (elimina cadastros incompletos)
      // - Filme já lançado (elimina títulos futuros sem avaliação)
      const validMovies = (data.results || []).filter((item) => {
        const hasPoster = Boolean(item.poster_path);
        const isReleased = Boolean(item.release_date && new Date(item.release_date).getTime() <= now);
        return hasPoster && isReleased;
      });

      // Filtro de Integridade Visual: o título ou título original deve conter termos da busca
      const tokenFilteredMovies = filterByVisibleTokens(validMovies, searchTerm);

      // 4. Proteções automáticas de recuperação (Word Split & Typos Fuzzy):
      const topInitialVotes =
        tokenFilteredMovies.length > 0
          ? Math.max(...tokenFilteredMovies.map((m) => m.vote_count || 0))
          : 0;

      const shouldTryWordSplit =
        tokenFilteredMovies.length === 0 ||
        (tokenFilteredMovies.length <= 2 && topInitialVotes < 100);

      if (shouldTryWordSplit) {
        // Proteção A: Auto-segmentação de palavras sem espaço (ex: "jogosmortais" -> "jogos mortais", "starwars" -> "star wars")
        const wordSplit = await findWordSegmentationSplit(searchTerm, yearParam, signal);
        if (
          wordSplit &&
          wordSplit.results.length > 0 &&
          (tokenFilteredMovies.length === 0 || wordSplit.topVotes > Math.max(topInitialVotes * 5, 200))
        ) {
          const splitValid = filterByVisibleTokens(wordSplit.results, wordSplit.candidate);
          if (splitValid.length > 0) {
            return {
              movies: rankSearchResults(
                splitValid.map(mapTMDBMovie),
                normalizeSearchString(wordSplit.candidate)
              ),
              correctedQuery: wordSplit.candidate,
            };
          }
        }
      }

      // Se continua com 0 resultados, tenta typo fuzzy com Levenshtein (ex: "batiman" -> "batman")
      if (tokenFilteredMovies.length === 0) {
        const correctedTerm = findFuzzyCorrection(searchTerm);
        if (correctedTerm && correctedTerm !== searchTerm) {
          const retryPath = `/search/movie?query=${encodeURIComponent(correctedTerm)}&language=pt-BR&include_adult=false${yearParam}`;
          const retryData = await fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(retryPath, signal);
          const retryValid = (retryData.results || []).filter((item) => {
            const hasPoster = Boolean(item.poster_path);
            const isReleased = Boolean(item.release_date && new Date(item.release_date).getTime() <= now);
            return hasPoster && isReleased;
          });

          const retryTokenFiltered = filterByVisibleTokens(retryValid, correctedTerm);
          if (retryTokenFiltered.length > 0) {
            return {
              movies: rankSearchResults(
                retryTokenFiltered.map(mapTMDBMovie),
                normalizeSearchString(correctedTerm)
              ),
              correctedQuery: correctedTerm,
            };
          }
        }
      }

      return {
        movies: rankSearchResults(tokenFilteredMovies.map(mapTMDBMovie), normalizedQuery),
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      console.warn(`Falha na busca remota para "${rawQuery}":`, err);
    }
  }

  // 5. Fallback Offline no catálogo mock local
  const localResults = moviesMock.filter((m) => {
    const hasPoster = Boolean(m.posterPath);
    const isReleased = Boolean(m.releaseDate && new Date(m.releaseDate).getTime() <= now);
    if (!hasPoster || !isReleased) return false;

    const titleNorm = normalizeSearchString(m.title);
    const origNorm = m.originalTitle ? normalizeSearchString(m.originalTitle) : "";
    return titleNorm.includes(normalizedQuery) || origNorm.includes(normalizedQuery);
  });

  return {
    movies: rankSearchResults(localResults, normalizedQuery),
  };
}

/**
 * Poda Dinâmica Adaptativa por Degrau de Relevância (Relative Confidence Pruning):
 * - Elimina filmes com ruído estatístico (menos de 5 votos) para evitar "nota 10 com 1 voto só".
 * - Se o filme líder é um marco cultural consagrado (votos > 1000, ex: "La La Land", "Oppenheimer", "Interestelar"):
 *   calcula o degrau relativo de relevância (mínimo de 2% dos votos do líder ou 300 votos).
 *   Qualquer filme posterior que não atinja esse degrau e não seja match de título exato é descartado.
 * - Sagas e franquias consagradas (onde todos os filmes têm milhares de votos) são mantidas integralmente.
 * - Limite de teto de segurança em 10 itens para manter o Command Palette ágil.
 */
function adaptiveDynamicPrune(rankedMovies: Movie[], normalizedQuery: string): Movie[] {
  if (rankedMovies.length <= 1) return rankedMovies;

  const topMovie = rankedMovies[0];
  const maxVotes = topMovie.voteCount || 0;

  // Se o filme líder possui grande volume de votos (> 1000 votos)
  if (maxVotes > 1000) {
    const minThreshold = Math.min(Math.max(maxVotes * 0.02, 300), 1000);

    const pruned = rankedMovies.filter((m) => {
      const norm = normalizeSearchString(m.title);
      const strip = stripLeadingArticles(norm);
      const prime = stripLeadingArticles(normalizeSearchString(m.title.split(":")[0]));
      const isExact = strip === normalizedQuery || prime === normalizedQuery;

      // Se for match exato de título (mesmo que com votos moderados >= 50), preserva
      if (isExact && (m.voteCount || 0) >= 50) return true;

      // Para outros filmes, exige que pertença ao degrau cultural proporcional
      return (m.voteCount || 0) >= minThreshold;
    });

    return pruned.slice(0, 10);
  }

  // Para filmes menores ou de catálogo local, exige ao menos 5 votos para evitar notas 10 com 1 voto único
  return rankedMovies.filter((m) => (m.voteCount || 0) >= 5).slice(0, 10);
}

/**
 * Algoritmo de ranking e ordenação matemática (Pilar 1 - Nível Sênior):
 * 1. Match Exato de Título epônimo fundador com relevância consolidada tem precedência no topo (#1).
 * 2. Linha Principal de Cinema (Main Feature Timeline): filmes que contêm todos os termos da busca
 *    e possuem engajamento compatível com o líder da franquia são ordenados estritamente por cronologia.
 *    Isso impede que mini-curtas de 5 minutos (ex: "Toy Story Toons", "Shrek no Natal") se infiltrem
 *    entre os longas oficiais de cinema (ex: Toy Story 1, 2, 3 e 4).
 * 3. Segunda Linha (Curtas, Especiais e Spin-offs): entram ordenadamente na sequência.
 * 4. Poda Dinâmica Adaptativa: se a busca for por um filme único ("La La Land"), devolve exatamente 1 filme;
 *    se for franquia, preserva todos os clássicos até o teto de 10.
 */
function rankSearchResults(movies: Movie[], normalizedQuery: string): Movie[] {
  if (movies.length <= 1) return movies;

  const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length >= 2);
  const maxVotes = Math.max(...movies.map((m) => m.voteCount || 0), 0);

  // Patamar do Cânone Principal de Cinema: exige que o longa tenha peso cultural compatível
  // com o líder da franquia (pelo menos 15% dos votos do líder, ou mínimo de 1.200 a 3.000 votos)
  const canonThreshold = Math.min(Math.max(maxVotes * 0.15, 1200), 3000);

  const sorted = [...movies].sort((a, b) => {
    const normA = normalizeSearchString(a.title);
    const normB = normalizeSearchString(b.title);
    const origA = a.originalTitle ? normalizeSearchString(a.originalTitle) : "";
    const origB = b.originalTitle ? normalizeSearchString(b.originalTitle) : "";
    const stripA = stripLeadingArticles(normA);
    const stripB = stripLeadingArticles(normB);
    const primeA = stripLeadingArticles(normalizeSearchString(a.title.split(":")[0]));
    const primeB = stripLeadingArticles(normalizeSearchString(b.title.split(":")[0]));

    // 1. Match exato de título fundador epônimo ("Homem-Aranha" de 2002 ou "Jogos Mortais" de 2004)
    const fullExactA = stripA === normalizedQuery || origA === normalizedQuery;
    const fullExactB = stripB === normalizedQuery || origB === normalizedQuery;

    const isEponymousA = fullExactA && (a.voteCount || 0) > 1000;
    const isEponymousB = fullExactB && (b.voteCount || 0) > 1000;
    if (isEponymousA && !isEponymousB) return -1;
    if (!isEponymousA && isEponymousB) return 1;

    // 2. Cobertura Universal de Tokens: o filme contém todos os termos da busca?
    const hasAllA = queryTokens.every((tok) => normA.includes(tok) || origA.includes(tok));
    const hasAllB = queryTokens.every((tok) => normB.includes(tok) || origB.includes(tok));

    // Nível 1: Longas-Metragens da Linha Principal de Cinema (Main Feature Line)
    const isMainFeatureA = hasAllA && (a.voteCount || 0) >= canonThreshold;
    const isMainFeatureB = hasAllB && (b.voteCount || 0) >= canonThreshold;

    if (isMainFeatureA && isMainFeatureB) {
      // Cronologia perfeita dos longas-metragens oficiais de cinema (1995 -> 1999 -> 2010 -> 2019)
      return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
    }
    if (isMainFeatureA && !isMainFeatureB) return -1;
    if (!isMainFeatureA && isMainFeatureB) return 1;

    // Nível 2: Curtas, spin-offs e especiais de TV (ordenados cronologicamente na sequência)
    const isSecondaryA = hasAllA && (a.voteCount || 0) >= 300;
    const isSecondaryB = hasAllB && (b.voteCount || 0) >= 300;
    if (isSecondaryA && isSecondaryB) {
      return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
    }
    if (isSecondaryA && !isSecondaryB) return -1;
    if (!isSecondaryA && isSecondaryB) return 1;

    // 3. Match de título principal (completo ou antes de :)
    const exactA = fullExactA || primeA === normalizedQuery;
    const exactB = fullExactB || primeB === normalizedQuery;
    if (exactA && !exactB) return -1;
    if (!exactA && exactB) return 1;
    if (exactA && exactB) {
      return (b.voteCount || 0) - (a.voteCount || 0);
    }

    if (hasAllA && !hasAllB) return -1;
    if (!hasAllA && hasAllB) return 1;

    // 4. Critério geral: Popularidade e Votos
    return (b.voteCount || 0) - (a.voteCount || 0);
  });

  // Aplica o corte dinâmico adaptativo baseado no abismo de relevância
  return adaptiveDynamicPrune(sorted, normalizedQuery);
}
