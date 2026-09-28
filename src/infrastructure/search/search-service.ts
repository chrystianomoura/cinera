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

function getCognateSynonym(entity: string | null): string | null {
  if (!entity) return null;
  for (const [en, pt] of Object.entries(CINEMA_COGNATES)) {
    if (entity === pt || entity.includes(pt) || pt.includes(entity)) return en;
    if (entity === en || entity.includes(en) || en.includes(entity)) return pt;
  }
  return null;
}

/**
 * Normaliza strings removendo acentos, padronizando conectores (& e +),
 * preservando caracteres Unicode (\p{L} para scripts internacionais como japonês/coreano/cirílico)
 * e mapeando termos bilíngues universais.
 */
export function normalizeSearchString(text: string): string {
  let res = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " e ")
    .replace(/\+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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
}

/**
 * Filtra filmes garantindo integridade e transparência textual com o que o usuário vê na tela:
 * 1. Visibilidade Direta em Português: Se o termo existe no título traduzido (que o usuário lê no card),
 *    o filme é aprovado com precedência.
 * 2. Correspondência Internacional no Título Original:
 *    - Para termos de 1 única palavra (ex: "doom", "jaws", "alien"): só aprova se o título original for
 *      exatamente a obra buscada (match exato homônimo). Isso impede que uma palavra avulsa de cauda em inglês
 *      (ex: "The Doom Generation" -> "Geração Maldita", "Temple of Doom" -> "Indiana Jones") traga filmes cujo
 *      nome em português não tem nenhuma relação com o termo.
 *    - Para termos compostos de 2+ palavras (ex: "temple of doom", "fight club"): aprova se o título original
 *      contiver a frase contígua.
 */
function filterByVisibleTokens(movies: TMDBMovieRaw[], tokens: string[], cleanQuery: string): TMDBMovieRaw[] {
  if (tokens.length === 0) return movies;

  const rawQ = normalizeSearchString(cleanQuery);
  const tokenRegexes = tokens.map(
    (token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
  );

  return movies.filter((m) => {
    const titleNorm = normalizeSearchString(m.title || "");
    const origNorm = normalizeSearchString(m.original_title || "");

    // 1. Visibilidade Direta em Português: o termo existe no título que o usuário lê na tela
    const matchPt = tokenRegexes.every((regex) => regex.test(titleNorm));
    if (matchPt) return true;

    // 2. Se o título em português NÃO contém o termo, só aceita o título original em inglês se:
    const matchOrig = tokenRegexes.every((regex) => regex.test(origNorm));
    if (!matchOrig) return false;

    const origStrip = stripLeadingArticles(origNorm);

    // Se for termo de 1 única palavra (ex: "doom", "jaws", "alien"):
    // Só aprova se o título em inglês for exatamente a obra buscada (match exato)
    if (tokens.length === 1) {
      return origNorm === rawQ || origStrip === rawQ;
    }

    // Se for termo composto (ex: "fight club", "temple of doom", "dark knight"):
    // Aceita se o título em inglês contiver a frase contígua
    return origNorm.includes(rawQ) || origStrip.includes(rawQ);
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
    // 3. Palavra inteira correspondente no título visível em português
    else if (new RegExp(`\\b${rawQ}\\b`, "i").test(titleNorm)) {
      relevance = 250;
    }
    // 4. Palavra inteira no título original em inglês (termo não visível em português)
    else if (origNorm && new RegExp(`\\b${rawQ}\\b`, "i").test(origNorm)) {
      relevance = 150;
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
      const tokenFilteredMovies = filterByVisibleTokens(validMovies, visibleTokens, unaccentedQuery);

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

        const canonicalMovieIds = new Set<number>();
        let matchedPrimaryEntity: string | null = null;
        const normQ = stripLeadingArticles(normalizeSearchString(cleanQuery));
        const queryTokensCount = cleanQuery.split(/\s+/).filter(Boolean).length;

        const candidateEntries = candidateCols.slice(0, 5).map((candidateCol, index) => {
          const isDirectMatch = matchFranchise(candidateCol.name || "", candidateCol.original_name, cleanQuery);

          // Extração da Raiz Nominal da Franquia (Gramática de Catálogo: delimitador ':' ou ' - ')
          const baseNamePt = (candidateCol.name || "").split(/:|\s+-\s+/)[0];
          const baseNameOrig = (candidateCol.original_name || "").split(/:|\s+-\s+/)[0];
          const cleanRootPt = cleanFranchiseName(baseNamePt);
          const stripRootPt = stripLeadingArticles(cleanRootPt);
          const cleanRootOrig = cleanFranchiseName(baseNameOrig);
          const stripRootOrig = stripLeadingArticles(cleanRootOrig);

          const isRootMatch =
            cleanRootPt === normQ ||
            stripRootPt === normQ ||
            cleanRootOrig === normQ ||
            stripRootOrig === normQ;

          const cleanCandidate = cleanFranchiseName(candidateCol.name || "");
          const stripCandidate = stripLeadingArticles(cleanCandidate);
          const origCandidate = candidateCol.original_name ? cleanFranchiseName(candidateCol.original_name) : "";
          const stripOrigCandidate = stripLeadingArticles(origCandidate);

          // Regra Preditiva de Convergência de Saga:
          const isPredictivePrefix =
            (stripCandidate.length > 0 && stripCandidate.startsWith(normQ)) ||
            (stripOrigCandidate.length > 0 && stripOrigCandidate.startsWith(normQ));
          const maxTargetLen = Math.max(stripCandidate.length, stripOrigCandidate.length);
          const coverage = maxTargetLen > 0 ? normQ.length / maxTargetLen : 0;
          const isPredictiveMatch =
            isPredictivePrefix && (queryTokensCount >= 2 || normQ.length >= 6) && coverage >= 0.65;

          const isCandidateToInspect =
            isDirectMatch ||
            isRootMatch ||
            isPredictiveMatch ||
            index === 0;

          return {
            candidateCol,
            isDirectMatch,
            isRootMatch,
            isPredictiveMatch,
            cleanRootPt,
            stripRootPt,
            cleanCandidate,
            stripCandidate,
            cleanRootOrig,
            stripOrigCandidate,
            isCandidateToInspect,
          };
        });

        const qualifyingCandidates = candidateEntries.filter((e) => e.isCandidateToInspect);

        // Dispara requisições dos detalhes das coleções em paralelo via Promise.allSettled (elimina latência sequencial)
        const settledCollections = await Promise.allSettled(
          qualifyingCandidates.map((entry) =>
            fetchFromTMDB<{ parts?: TMDBMovieRaw[] }>(
              `/collection/${entry.candidateCol.id}?language=pt-BR`,
              signal
            )
          )
        );

        for (let i = 0; i < qualifyingCandidates.length; i++) {
          const entry = qualifyingCandidates[i];
          const settled = settledCollections[i];
          if (settled.status !== "fulfilled" || !settled.value.parts) continue;

          const parts = (settled.value.parts || []).filter((item) => {
            const hasPoster = Boolean(item.poster_path);
            const isReleased = Boolean(item.release_date && new Date(item.release_date).getTime() <= now);
            const hasVotes = (item.vote_count || 0) > 0;
            return hasPoster && isReleased && hasVotes;
          });

          // Regra de Ouro 2: Piso estatístico de relevância (mínimo 500 votos em um filme ou 1000 somados)
          const totalVotes = parts.reduce((sum, p) => sum + (p.vote_count || 0), 0);
          const maxPartVotes = Math.max(...parts.map((p) => p.vote_count || 0), 0);
          const hasSocialProof =
            maxPartVotes >= SEARCH_CONFIG.COLLECTION_MIN_VOTES ||
            totalVotes >= SEARCH_CONFIG.COLLECTION_TOTAL_VOTES;

          if (!hasSocialProof) continue;

          // Regra Anti-Monopólio / Ambiguidade Cultural (Queries de 1 única palavra):
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

          // Busca dinâmica de cognato internacional para unir eras e reboots sem nenhum hardcode
          const enSynonym = getCognateSynonym(matchedPrimaryEntity);
          const isSisterFranchise =
            canonicalCollectionMovies.length > 0 &&
            queryTokensCount >= 2 &&
            Boolean(matchedPrimaryEntity) &&
            (entry.stripCandidate.includes(matchedPrimaryEntity!) ||
              entry.cleanCandidate.includes(matchedPrimaryEntity!) ||
              entry.stripRootPt.includes(matchedPrimaryEntity!) ||
              entry.cleanRootPt.includes(matchedPrimaryEntity!) ||
              (enSynonym ? entry.stripOrigCandidate.includes(enSynonym) || entry.cleanRootOrig.includes(enSynonym) : false));

          // Regra Orgânica do Prefixo Canônico dos Filmes (ex: "007: ..."):
          const matchingPrefixParts = parts.filter((p) => {
            const prefixPt = stripLeadingArticles(normalizeSearchString((p.title || "").split(/[:-]/)[0]));
            const prefixOrig = stripLeadingArticles(normalizeSearchString((p.original_title || "").split(/[:-]/)[0]));
            return prefixPt === normQ || prefixOrig === normQ;
          });

          const isValidFranchiseMatch =
            entry.isDirectMatch ||
            entry.isRootMatch ||
            entry.isPredictiveMatch ||
            isSisterFranchise ||
            (parts.length > 0 && matchingPrefixParts.length / parts.length >= 0.5);

          if (isValidFranchiseMatch) {
            if (!matchedPrimaryEntity) {
              matchedPrimaryEntity = normQ;
            }

            for (const p of parts) {
              if (!canonicalMovieIds.has(p.id)) {
                canonicalMovieIds.add(p.id);
                canonicalCollectionMovies.push(p);
              }
            }

            // Para buscas de 1 única palavra sem match de raiz exata, não unifica múltiplas coleções
            if (queryTokensCount === 1 && !entry.isRootMatch) {
              break;
            }
          }
        }
      }

      // 3. Mescla de resultados: Coleções Canônicas entregam a saga cronológica no topo + derivados logo abaixo
      if (canonicalCollectionMovies.length > 0) {
        canonicalCollectionMovies.sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return dateA - dateB;
        });

        // Enriquece os títulos dos filmes da coleção com as versões oficiais localizadas em pt-BR da busca
        const localizedTitlesById = new Map<number, string>();
        validMovies.forEach((m) => {
          if (m.title) localizedTitlesById.set(m.id, m.title);
        });

        const localizedCanonicalMovies = canonicalCollectionMovies.map((p) => {
          const localizedTitle = localizedTitlesById.get(p.id);
          if (localizedTitle) {
            return { ...p, title: localizedTitle };
          }
          return p;
        });

        // Identifica e preserva filmes secundários / spin-offs legítimos
        // (ex: A Guerra dos Rohirrim em Senhor dos Anéis, Rogue One em Star Wars, Hobbs & Shaw em Velozes e Furiosos)
        const seenIds = new Set(canonicalCollectionMovies.map((m) => m.id));
        const secondaryRaw = tokenFilteredMovies.filter((m) => !seenIds.has(m.id));
        const secondaryMapped = secondaryRaw.map(mapTMDBMovie);
        const rankedSecondary = rankSearchResults(secondaryMapped, normalizedQuery);

        return {
          movies: [
            ...localizedCanonicalMovies.map(mapTMDBMovie),
            ...rankedSecondary,
          ],
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
