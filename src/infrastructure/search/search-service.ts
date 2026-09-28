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

  // Higiene de Catálogo
  MIN_BROAD_VOTES: 20,                // Piso de 20 votos para filmes secundários em buscas gerais (elimina making-ofs, lutas e ruídos)
  EXACT_MATCH_MIN_VOTES: 1,           // Passe Livre: se o título for idêntico à busca, basta ter 1 voto público

  // Calibração Bayesiana de Qualidade (Fórmula Ponderada IMDb / TMDB)
  BAYESIAN_GLOBAL_MEAN: 6.5,          // Média global de notas do catálogo de cinema
  BAYESIAN_MIN_WEIGHT: 25,            // Amostragem mínima de votos para validar a nota média (desarma notas 10 com 1 voto)
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
 * removendo apenas sufixos organizacionais como "Coleção", "Collection", "Saga", "Series" e "Franquia".
 */
export function cleanFranchiseName(name: string): string {
  if (!name) return "";
  return normalizeSearchString(name)
    .replace(/\b(colecao|collection|saga|series|franquia)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Avalia se o termo buscado pelo usuário corresponde com exatidão (1:1)
 * ao nome da franquia/coleção oficial (com ou sem artigo inicial).
 */
export function matchFranchise(colName: string, colOrigName: string | undefined, query: string): boolean {
  const normQ = cleanFranchiseName(query);
  const stripQ = stripLeadingArticles(normQ);

  const normCol = cleanFranchiseName(colName);
  const stripCol = stripLeadingArticles(normCol);

  const normOrig = colOrigName ? cleanFranchiseName(colOrigName) : "";
  const stripOrig = stripLeadingArticles(normOrig);

  const isExactPt = normCol === normQ || stripCol === stripQ || normCol === stripQ || stripCol === normQ;
  const isExactOrig = normOrig && (normOrig === normQ || stripOrig === stripQ || normOrig === stripQ || stripOrig === normQ);

  return Boolean(isExactPt || isExactOrig);
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
 * Filtra filmes garantindo coerência textual com os termos buscados:
 * 1. Coerência de Idioma: Todos os termos da busca devem estar presentes no título em português
 *    OU todos no título original (evitando cruzamentos híbridos onde um termo está em espanhol e outro em português).
 * 2. Prefixos de Palavra: O termo deve corresponder ao início de uma palavra (\b), evitando que sufixos
 *    aleatórios de plurais (ex: "mes-es") deem falso positivo para digitações parciais (ex: "es" de estrelas).
 */
function filterByVisibleTokens(movies: TMDBMovieRaw[], tokens: string[]): TMDBMovieRaw[] {
  if (tokens.length === 0) return movies;

  const tokenRegexes = tokens.map(
    (token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
  );

  return movies.filter((m) => {
    const titleNorm = normalizeSearchString(m.title || "");
    const origNorm = normalizeSearchString(m.original_title || "");

    const matchPt = tokenRegexes.every((regex) => regex.test(titleNorm));
    const matchOrig = tokenRegexes.every((regex) => regex.test(origNorm));

    return matchPt || matchOrig;
  });
}

/**
 * Poda e formatação de resultados gerais:
 * - Passe Livre para Match Exato: se o título corresponder exatamente ao que foi digitado (ex: filme independente,
 *   curta autoral ou produção de faculdade), basta ter 1 avaliação pública para assumir o topo da busca.
 * - Piso de Higiene (20 votos): produções secundárias em buscas amplas precisam de no mínimo 20 avaliações para
 *   eliminar making-ofs de 5 minutos, lutas esportivas, testes amadores e ruídos caseiros.
 * - Preenche confortavelmente até 10 filmes relevantes.
 */
function pruneSearchResults(rankedMovies: Movie[], normalizedQuery: string): Movie[] {
  const rawQ = normalizedQuery.trim();
  const cleanQ = cleanFranchiseName(normalizedQuery);

  return rankedMovies
    .filter((m) => {
      const votes = m.voteCount || 0;
      if (votes < 1) return false;

      const norm = normalizeSearchString(m.title);
      const strip = stripLeadingArticles(norm);
      const clean = cleanFranchiseName(m.title);
      const origNorm = m.originalTitle ? normalizeSearchString(m.originalTitle) : "";
      const origStrip = stripLeadingArticles(origNorm);
      const cleanOrig = m.originalTitle ? cleanFranchiseName(m.originalTitle) : "";

      const isExactMatch =
        norm === rawQ ||
        strip === rawQ ||
        clean === cleanQ ||
        (origNorm && origNorm === rawQ) ||
        (origStrip && origStrip === rawQ) ||
        (cleanOrig && cleanOrig === cleanQ);

      if (isExactMatch) {
        return votes >= SEARCH_CONFIG.EXACT_MATCH_MIN_VOTES;
      }

      return votes >= SEARCH_CONFIG.MIN_BROAD_VOTES;
    })
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
      relevance = 400;
    }
    // 2. Inicia com o termo buscado (ex: "O Senhor dos Anéis" ou "Senhor das Armas" para "senhor")
    else if (
      stripLeadingArticles(titleNorm).startsWith(rawQ) ||
      cleanTitle.startsWith(cleanQ) ||
      (origNorm && stripLeadingArticles(origNorm).startsWith(rawQ))
    ) {
      relevance = 300;
    }
    // 3. Palavra inteira correspondente (ex: "Vida de Inseto", "Homem-Formiga", "Um Senhor Estagiário")
    else if (
      new RegExp(`\\b${rawQ}\\b`, "i").test(titleNorm) ||
      (origNorm && new RegExp(`\\b${rawQ}\\b`, "i").test(origNorm))
    ) {
      relevance = 250;
    }

    // 4. Score Bayesiano de Popularidade, Votos e Qualidade
    const v = m.voteCount || 0;
    const R = m.voteAverage || 0;
    const pop = m.popularity || 0;

    // Nota Bayesiana Ponderada (Fórmula IMDB Top 250):
    // Neutraliza notas extremas com poucos votos (uma nota 10 com 1 voto vai para 6.63),
    // enquanto notas com volume real (milhares de avaliações) mantêm sua autoridade plena.
    const bayesianRating =
      (v / (v + SEARCH_CONFIG.BAYESIAN_MIN_WEIGHT)) * R +
      (SEARCH_CONFIG.BAYESIAN_MIN_WEIGHT / (v + SEARCH_CONFIG.BAYESIAN_MIN_WEIGHT)) *
        SEARCH_CONFIG.BAYESIAN_GLOBAL_MEAN;

    // Escala de votos logarítmica com amplitude para blockbusters
    const voteWeight = Math.log10(v + 1) * 60;
    // Qualidade ponderada sobre a nota bayesiana
    const qualityWeight = (bayesianRating - 5.0) * 15;
    const popWeight = Math.min(pop, 50);

    const totalScore = relevance + voteWeight + qualityWeight + popWeight;
    return { movie: m, score: totalScore, isExact: relevance >= 400 };
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
  return pruneSearchResults(sorted, normalizedQuery);
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
  const unaccentedQuery = normalizeSearchString(cleanQuery);
  const apiSearchTerm = extractSearchKeywords(cleanQuery);

  // 1. Execução contra a API oficial de filmes do TMDB (/search/movie e /search/collection)
  if (isTmdbConfigured()) {
    try {
      const yearParam = year ? `&primary_release_year=${year}` : "";
      const moviePath = `/search/movie?query=${encodeURIComponent(unaccentedQuery)}&language=pt-BR&include_adult=false${yearParam}`;
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

      // Filtro de integridade visual com tokens significativos da consulta normalizada
      const visibleTokens = unaccentedQuery.split(/\s+/).filter((t) => t.length >= 2);
      const tokenFilteredMovies = filterByVisibleTokens(validMovies, visibleTokens);

      // 2. Verifica se a busca casa com uma Coleção Canônica Oficial (ex: Star Wars, Senhor dos Anéis, Predador)
      let canonicalCollectionMovies: TMDBMovieRaw[] = [];
      const NOISE_COLLECTION_WORDS = ["animado", "animated", "lego", "especial", "seasonal", "parodia", "parody"];

      // Uma coleção só pode ser avaliada se a query for substancial (pelo menos 2 caracteres limpos)
      if (cleanQuery.length >= 2 && collectionData?.results?.length) {
        const candidateCols = collectionData.results.filter((col) => {
          const colClean = cleanFranchiseName(col.name || "");
          const origClean = cleanFranchiseName(col.original_name || "");
          return !NOISE_COLLECTION_WORDS.some(
            (w) => (colClean.includes(w) || origClean.includes(w)) && !cleanQuery.includes(w)
          );
        });

        for (const candidateCol of candidateCols.slice(0, 3)) {
          const isDirectMatch = matchFranchise(candidateCol.name || "", candidateCol.original_name, cleanQuery);

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
            const hasSocialProof = maxPartVotes >= SEARCH_CONFIG.COLLECTION_MIN_VOTES || totalVotes >= SEARCH_CONFIG.COLLECTION_TOTAL_VOTES;

            if (!hasSocialProof) continue;

            const normQ = stripLeadingArticles(normalizeSearchString(cleanQuery));
            const queryTokensCount = cleanQuery.split(/\s+/).filter(Boolean).length;

            // Regra Anti-Monopólio / Ambiguidade Cultural (Queries de 1 única palavra):
            // Quando o usuário digita apenas 1 palavra (ex: "guardiões", "senhor", "batman"), pode haver um filme muito maior
            // que começa com essa mesma palavra mas pertence a outra saga (ex: "Guardiões da Galáxia" com 30k votos vs duologia russa "Guardiões" com 800 votos).
            // Se existir um filme externo com mais de 3x os votos do líder da coleção que também começa com a palavra,
            // o termo é ambíguo: não monopolizamos a tela com a coleção menor; deixamos o ranking bayesiano exibir todos os concorrentes.
            if (queryTokensCount === 1) {
              const maxExternalVotes = Math.max(
                ...validMovies
                  .filter((m) => {
                    const normTitlePt = stripLeadingArticles(normalizeSearchString(m.title || ""));
                    const normTitleOrig = stripLeadingArticles(normalizeSearchString(m.original_title || ""));
                    const startsWithPt = normTitlePt === normQ || normTitlePt.startsWith(normQ + " ");
                    const startsWithOrig = normTitleOrig === normQ || normTitleOrig.startsWith(normQ + " ");
                    return (startsWithPt || startsWithOrig) && !parts.some((p) => p.id === m.id);
                  })
                  .map((m) => m.vote_count || 0),
                0
              );

              if (maxExternalVotes > maxPartVotes * 3) {
                continue;
              }
            }

            // Se for match direto do nome da franquia (ex: "star wars", "senhor dos aneis", "velozes e furiosos")
            if (isDirectMatch) {
              canonicalCollectionMovies = parts;
              break;
            }

            // Regra Orgânica do Prefixo Canônico dos Filmes:
            // Se o nome da pasta no TMDB for diferente (ex: "James Bond: Coleção"), mas os filmes da coleção tiverem
            // como prefixo de cinema exatamente o termo buscado (ex: "007: ..."), a saga é validada organicamente.
            const matchingPrefixParts = parts.filter((p) => {
              const prefixPt = stripLeadingArticles(normalizeSearchString((p.title || "").split(/[:-]/)[0]));
              const prefixOrig = stripLeadingArticles(normalizeSearchString((p.original_title || "").split(/[:-]/)[0]));
              return prefixPt === normQ || prefixOrig === normQ;
            });

            if (parts.length > 0 && matchingPrefixParts.length / parts.length >= 0.5) {
              canonicalCollectionMovies = parts;
              break;
            }
          } catch {
            // Em caso de falha de rede na coleção, segue com os filmes padrão
          }
        }
      }

      // 3. Mescla de resultados: Coleções Canônicas entregam a filmografia completa da saga
      if (canonicalCollectionMovies.length > 0) {
        canonicalCollectionMovies.sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return dateA - dateB;
        });

        // Mostra a saga completa em ordem cronológica (o tanto de filme que a franquia tiver)
        return {
          movies: canonicalCollectionMovies.map(mapTMDBMovie),
        };
      }

      // Para buscas gerais ou filmes autorais/únicos, aplica ranking bayesiano e preenche até 10 filmes relevantes
      const finalMapped = tokenFilteredMovies.map(mapTMDBMovie);
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
