import type { Movie } from "@/domain";
import { fetchFromTMDB, isTmdbConfigured } from "../api/tmdb-client";
import { mapTMDBMovie } from "../api/tmdb-mappers";
import { moviesMock } from "../mock/movies.mock";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../api/tmdb-types";

/**
 * Configuração centralizada e transparente dos thresholds do motor de busca.
 */
export const SEARCH_CONFIG = {
  MAX_QUERY_LENGTH: 80,
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 10,

  // Critérios de Coleção Canônica
  COLLECTION_MIN_VOTES: 500,          // Votos mínimos em um filme da coleção para considerá-la canônica
  COLLECTION_TOTAL_VOTES: 1000,       // Soma mínima de votos da coleção

  // Poda Dinâmica Adaptativa por Degrau de Relevância
  POPULAR_LEADER_VOTES: 1000,         // Define se o líder da busca tem grande volume cultural
  ADAPTIVE_MIN_PERCENT: 0.02,         // Mínimo de 2% dos votos do líder
  ADAPTIVE_MIN_FLOOR: 300,            // Piso do degrau de relevância
  ADAPTIVE_MIN_CEIL: 1000,            // Teto do degrau de relevância
  EXACT_MATCH_PRESERVE_VOTES: 50,     // Votos mínimos para preservar match exato de título
  MIN_LOCAL_VOTES: 5,                 // Elimina ruído estatístico de notas 10 com 1 único voto
} as const;

/**
 * Stop words e conectores gramaticais que geram divergência em distribuidoras de cinema
 * (ex: "e" vs "&", "de", "do", "da", "para", etc.).
 */
const STOP_WORDS = new Set([
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "e", "em", "para", "com",
  "the", "of", "and", "in"
]);

/**
 * Mapeamento de termos cinematográficos bilíngues (inglês/português)
 * para sincronizar buscas populares como "predator", "spider-man" ou "avengers"
 * com o catálogo brasileiro do TMDB.
 */
const CINEMA_COGNATES: Record<string, string> = {
  predator: "predador",
  avengers: "vingadores",
  "spider man": "homem aranha",
  spiderman: "homem aranha",
};

/**
 * Normaliza strings removendo acentos, padronizando conectores (& e +),
 * mapeando termos bilíngues universais e limpando excesso de espaços.
 */
export function normalizeSearchString(text: string): string {
  let res = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " e ")
    .replace(/\+/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  for (const [en, pt] of Object.entries(CINEMA_COGNATES)) {
    if (res === en || res.startsWith(`${en} `)) {
      res = pt + res.slice(en.length);
    }
  }

  return res;
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
 * Limpa e padroniza títulos de franquias e coleções para comparação estrita (1:1),
 * removendo sufixos organizacionais como "Coleção", "Collection", "Saga" e stopwords.
 */
export function cleanFranchiseName(name: string): string {
  if (!name) return "";
  return normalizeSearchString(name)
    .replace(/\b(o|a|os|as|um|uma|the|da|do|dos|das|de|of|e|and|y)\b/gi, " ")
    .replace(/\b(colecao|collection|saga|series|franquia)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrai palavras-chave essenciais eliminando ruídos gramaticais para a consulta no TMDB.
 * Permite que "velozes e furiosos", "velozes & furiosos" e "+ velozes + furiosos"
 * consultem o TMDB como "velozes furiosos", resgatando 100% dos filmes da franquia.
 */
export function extractSearchKeywords(text: string): string {
  const norm = normalizeSearchString(text);
  const tokens = norm.split(/\s+/).filter(Boolean);
  const meaningful = tokens.filter((t) => !STOP_WORDS.has(t));

  if (meaningful.length >= 1) {
    return meaningful.join(" ");
  }
  return norm;
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

export interface SearchMoviesResult {
  movies: Movie[];
  correctedQuery?: string;
}

/**
 * Filtra filmes garantindo que pelo menos um dos termos principais da busca
 * esteja visível no título em português ou no título original do filme.
 */
function filterByVisibleTokens(movies: TMDBMovieRaw[], tokens: string[]): TMDBMovieRaw[] {
  if (tokens.length === 0) return movies;

  return movies.filter((m) => {
    const titleNorm = normalizeSearchString(m.title || "");
    const origNorm = normalizeSearchString(m.original_title || "");
    return tokens.some((token) => titleNorm.includes(token) || origNorm.includes(token));
  });
}

/**
 * Poda Dinâmica Adaptativa por Degrau de Relevância:
 * - Se o líder é consagrado (> 1000 votos): descarta cauda irrelevante respeitando o degrau.
 * - Garante preservação de títulos com match exato mesmo em nichos menores.
 * - Limita ao teto seguro (Top 10).
 */
function adaptiveDynamicPrune(rankedMovies: Movie[], normalizedQuery: string): Movie[] {
  if (rankedMovies.length <= 1) return rankedMovies;

  const topMovie = rankedMovies[0];
  const maxVotes = topMovie.voteCount || 0;

  if (maxVotes > SEARCH_CONFIG.POPULAR_LEADER_VOTES) {
    const minThreshold = Math.min(
      Math.max(maxVotes * SEARCH_CONFIG.ADAPTIVE_MIN_PERCENT, SEARCH_CONFIG.ADAPTIVE_MIN_FLOOR),
      SEARCH_CONFIG.ADAPTIVE_MIN_CEIL
    );

    const pruned = rankedMovies.filter((m) => {
      const norm = normalizeSearchString(m.title);
      const strip = stripLeadingArticles(norm);
      const clean = cleanFranchiseName(m.title);
      const isExact = strip === normalizedQuery || clean === cleanFranchiseName(normalizedQuery);

      if (isExact && (m.voteCount || 0) >= SEARCH_CONFIG.EXACT_MATCH_PRESERVE_VOTES) {
        return true;
      }

      return (m.voteCount || 0) >= minThreshold;
    });

    return pruned.slice(0, SEARCH_CONFIG.MAX_RESULTS);
  }

  return rankedMovies
    .filter((m) => (m.voteCount || 0) >= SEARCH_CONFIG.MIN_LOCAL_VOTES)
    .slice(0, SEARCH_CONFIG.MAX_RESULTS);
}

/**
 * Algoritmo universal de ranking bayesiano:
 * 1. Relevância Textual: Bônus máximo para títulos idênticos, seguido de prefixo e correspondência de palavra.
 * 2. Popularidade Bayesiana: Escala logarítmica de votos somada à popularidade TMDB.
 * 3. Desempate Histórico: Em caso de títulos idênticos (ex: original 1984 vs remake 2010), o pioneiro tem precedência.
 */
function rankSearchResults(movies: Movie[], normalizedQuery: string): Movie[] {
  if (movies.length <= 1) return movies;

  const rawQ = normalizedQuery.trim();
  const cleanQ = cleanFranchiseName(normalizedQuery);

  const scored = movies.map((m) => {
    const titleNorm = normalizeSearchString(m.title);
    const origNorm = m.originalTitle ? normalizeSearchString(m.originalTitle) : "";
    const cleanTitle = cleanFranchiseName(m.title);
    const cleanOrig = m.originalTitle ? cleanFranchiseName(m.originalTitle) : "";

    let relevance = 0;

    // 1. Título idêntico (ex: "Sim Senhor" ao buscar "sim senhor", "La La Land", "Oppenheimer")
    if (titleNorm === rawQ || origNorm === rawQ || cleanTitle === cleanQ || cleanOrig === cleanQ) {
      relevance += 1000;
    }
    // 2. Inicia com o termo buscado (ex: "O Senhor dos Anéis" ou "Senhor das Armas" para "senhor")
    else if (
      stripLeadingArticles(titleNorm).startsWith(rawQ) ||
      cleanTitle.startsWith(cleanQ) ||
      (origNorm && stripLeadingArticles(origNorm).startsWith(rawQ))
    ) {
      relevance += 400;
    }
    // 3. Palavra inteira correspondente (ex: "Sim Senhor", "Um Senhor Estagiário" para "senhor")
    else if (
      new RegExp(`\\b${rawQ}\\b`, "i").test(titleNorm) ||
      (origNorm && new RegExp(`\\b${rawQ}\\b`, "i").test(origNorm))
    ) {
      relevance += 200;
    }

    // 4. Score Bayesiano de Popularidade e Votos
    const votes = m.voteCount || 0;
    const pop = m.popularity || 0;
    const voteWeight = Math.log10(votes + 1) * 35;
    const popWeight = Math.min(pop, 100);

    const totalScore = relevance + voteWeight + popWeight;
    return { movie: m, score: totalScore, isExact: relevance >= 1000 };
  });

  scored.sort((a, b) => {
    // Se ambos forem match exato homônimo (ex: original 1984 vs remake 2010), o pioneiro tem precedência
    if (a.isExact && b.isExact) {
      const dateA = a.movie.releaseDate ? new Date(a.movie.releaseDate).getTime() : Infinity;
      const dateB = b.movie.releaseDate ? new Date(b.movie.releaseDate).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
    }
    return b.score - a.score;
  });

  const sorted = scored.map((s) => s.movie);
  return adaptiveDynamicPrune(sorted, normalizedQuery);
}

/**
 * Serviço de Busca Global do Cinera.
 * Integra busca textual inteligente, reconciliação estrita de Coleções Canônicas oficiais do TMDB
 * e ranking bayesiano universal de relevância.
 */
export async function searchCineraMovies(
  rawQuery: string,
  signal?: AbortSignal
): Promise<SearchMoviesResult> {
  const sanitized = rawQuery
    .slice(0, SEARCH_CONFIG.MAX_QUERY_LENGTH)
    .replace(/[\r\n\t]/g, " ")
    .trim();

  if (sanitized.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
    return { movies: [] };
  }

  const { cleanQuery, year } = extractYear(sanitized);
  const normalizedQuery = normalizeSearchString(stripLeadingArticles(cleanQuery));
  const apiSearchTerm = extractSearchKeywords(cleanQuery);

  // 1. Execução contra a API oficial de filmes do TMDB (/search/movie e /search/collection)
  if (isTmdbConfigured()) {
    try {
      const yearParam = year ? `&primary_release_year=${year}` : "";
      const moviePath = `/search/movie?query=${encodeURIComponent(apiSearchTerm)}&language=pt-BR&include_adult=false${yearParam}`;
      const collectionPath = `/search/collection?query=${encodeURIComponent(apiSearchTerm)}&language=pt-BR`;

      // Executa consulta de filmes e coleções em paralelo
      const [movieData, collectionData] = await Promise.all([
        fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(moviePath, signal),
        fetchFromTMDB<TMDBPaginatedResponse<{ id: number; name: string; original_name?: string }>>(collectionPath, signal).catch(() => null),
      ]);

      const now = Date.now();

      // Filtro de filmes: pôster obrigatório, já lançado comercialmente e com avaliações públicas
      const validMovies = (movieData.results || []).filter((item) => {
        const hasPoster = Boolean(item.poster_path);
        const isReleased = Boolean(item.release_date && new Date(item.release_date).getTime() <= now);
        const hasVotes = (item.vote_count || 0) > 0;
        return hasPoster && isReleased && hasVotes;
      });

      // Filtro de integridade visual com tokens significativos
      const visibleTokens = apiSearchTerm.split(/\s+/).filter((t) => t.length >= 2);
      const tokenFilteredMovies = filterByVisibleTokens(validMovies, visibleTokens);

      // 2. Verifica se a busca casa com uma Coleção Canônica Oficial (ex: Star Wars, Senhor dos Anéis, Predador)
      let canonicalCollectionMovies: TMDBMovieRaw[] = [];
      const NOISE_COLLECTION_WORDS = ["animado", "animated", "lego", "especial", "seasonal", "parodia", "parody"];

      const queryCleanFranchise = cleanFranchiseName(cleanQuery);

      // Uma coleção só pode ser avaliada se a query for substancial (pelo menos 2 caracteres limpos)
      if (queryCleanFranchise.length >= 2 && collectionData?.results?.length) {
        const candidateCol = collectionData.results.find((col) => {
          const colClean = cleanFranchiseName(col.name || "");
          const origClean = cleanFranchiseName(col.original_name || "");

          const hasNoise = NOISE_COLLECTION_WORDS.some(
            (w) => (colClean.includes(w) || origClean.includes(w)) && !queryCleanFranchise.includes(w)
          );
          if (hasNoise) return false;

          // Regra de Ouro 1: Match EXATO do nome da franquia (proibido .includes parcial em coleções)
          return colClean === queryCleanFranchise || origClean === queryCleanFranchise;
        });

        if (candidateCol) {
          try {
            const colDetails = await fetchFromTMDB<{ parts?: TMDBMovieRaw[] }>(
              `/collection/${candidateCol.id}?language=pt-BR`,
              signal
            );
            const parts = (colDetails.parts || []).filter((item) => {
              const hasPoster = Boolean(item.poster_path);
              const isReleased = Boolean(item.release_date && new Date(item.release_date).getTime() <= now);
              const hasVotes = (item.vote_count || 0) > 0;
              return hasPoster && isReleased && hasVotes;
            });

            // Regra de Ouro 2: Piso estatístico de relevância (mínimo 500 votos em um filme ou 1000 somados)
            const totalVotes = parts.reduce((sum, p) => sum + (p.vote_count || 0), 0);
            const maxPartVotes = Math.max(...parts.map((p) => p.vote_count || 0), 0);

            if (maxPartVotes >= SEARCH_CONFIG.COLLECTION_MIN_VOTES || totalVotes >= SEARCH_CONFIG.COLLECTION_TOTAL_VOTES) {
              canonicalCollectionMovies = parts;
            }
          } catch {
            // Em caso de falha de rede na coleção, segue com os filmes padrão
          }
        }
      }

      // 3. Mescla de resultados: Coleções Canônicas têm precedência cronológica da saga
      const seenIds = new Set<number>();
      const combinedRaw: TMDBMovieRaw[] = [];

      if (canonicalCollectionMovies.length > 0) {
        canonicalCollectionMovies.sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return dateA - dateB;
        });

        for (const m of canonicalCollectionMovies) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            combinedRaw.push(m);
          }
        }
      }

      // Adiciona outros filmes da busca normal que não estavam na coleção (ex: spin-offs de peso como Rogue One)
      for (const m of tokenFilteredMovies) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          combinedRaw.push(m);
        }
      }

      const finalMapped = combinedRaw.map(mapTMDBMovie);

      // Se houver coleção canônica associada, a ordem da saga oficial já está calibrada cronologicamente
      if (canonicalCollectionMovies.length > 0) {
        return {
          movies: finalMapped.slice(0, SEARCH_CONFIG.MAX_RESULTS),
        };
      }

      // Para buscas gerais ou filmes autorais/únicos, aplica ranking bayesiano e poda adaptativa
      return {
        movies: rankSearchResults(finalMapped, normalizedQuery),
      };
    } catch (err: unknown) {
      // Abortamento silencioso: digitação contínua não pode estourar erro na UI
      if (err instanceof Error && err.name === "AbortError") {
        return { movies: [] };
      }
      console.warn(`Falha na busca remota para "${rawQuery}":`, err);
    }
  }

  // 4. Fallback resiliente no catálogo mock local
  const now = Date.now();
  const localResults = moviesMock.filter((m) => {
    const hasPoster = Boolean(m.posterPath);
    const isReleased = Boolean(m.releaseDate && new Date(m.releaseDate).getTime() <= now);
    const hasVotes = (m.voteCount || 0) > 0;
    if (!hasPoster || !isReleased || !hasVotes) return false;

    const titleNorm = normalizeSearchString(m.title);
    const origNorm = m.originalTitle ? normalizeSearchString(m.originalTitle) : "";
    return titleNorm.includes(normalizedQuery) || origNorm.includes(normalizedQuery);
  });

  return {
    movies: rankSearchResults(localResults, normalizedQuery),
  };
}
