import type { Movie } from "@/domain";
import { fetchFromTMDB, isApiEnabled } from "../api/tmdb-client";
import { mapTMDBMovie } from "../api/tmdb-mappers";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../api/tmdb-types";

/**
 * Configuração centralizada e transparente dos thresholds do motor de busca.
 */
export const SEARCH_CONFIG = {
  MAX_QUERY_LENGTH: 80,
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 10,                    // Limite para buscas gerais. Coleções canônicas exibem a filmografia completa sem corte.

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
 * Mapeamento de termos de cinema bilíngues (inglês/português)
 * para sincronizar buscas populares como "predator", "spider-man" ou "avengers"
 * com o catálogo brasileiro do TMDB.
 */
const SPELLING_ALIASES = new Map<string, string>([
  ["spiderman", "spider man"],
]);

export function canonicalizeSpelling(text: string): string {
  return text
    .split(/\s+/)
    .map((token) => SPELLING_ALIASES.get(token.toLowerCase()) ?? token)
    .join(" ");
}

const CINEMA_COGNATES: Record<string, string> = {
  predator: "predador",
  avengers: "vingadores",
  "spider man": "homem aranha",
};

function getCognateSynonym(entity: string | null): string | null {
  if (!entity) return null;
  const normEntity = entity.trim().toLowerCase();
  for (const [en, pt] of Object.entries(CINEMA_COGNATES)) {
    if (normEntity === pt || normEntity === en) return normEntity === pt ? en : pt;
    if (normEntity.startsWith(`${pt} `) || normEntity.endsWith(` ${pt}`)) return en;
    if (normEntity.startsWith(`${en} `) || normEntity.endsWith(` ${en}`)) return pt;
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normaliza strings removendo acentos, padronizando conectores (& e +),
 * preservando caracteres Unicode (\p{L} para scripts internacionais como japonês/coreano/cirílico).
 * Mantém normalização linguística pura sem tradução automática de cognatos.
 */
export function normalizeSearchString(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/&/g, " e ")
    .replace(/\+/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Remove artigos e preposições iniciais para desfragmentar buscas por franquias
 * (ex: "os vingadores" -> "vingadores", "o poderoso chefao" -> "poderoso chefao").
 * Usa lookahead Unicode para não quebrar palavras como "ação" ou "aéreo".
 */
export function stripLeadingArticles(text: string): string {
  return text
    .replace(/^(?:(?:o|a|os|as|um|uma|uns|umas|the|an)(?![\p{L}\p{N}])\s*)+/iu, "")
    .trim();
}

/**
 * Limpa e padroniza títulos de franquias e coleções para comparação estrita (1:1),
 * removendo apenas sufixos organizacionais como "Coleção", "Collection", "Saga", "Series" e "Franquia".
 * Preserva scripts internacionais Unicode (\p{L}\p{N}).
 */
export function cleanFranchiseName(name: string): string {
  if (!name) return "";
  return normalizeSearchString(name)
    .replace(/\b(colecao|collection|saga|series|franquia)\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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
 * consultem o TMDB como "velozes furiosos", trazendo os filmes da franquia.
 */
function extractSearchKeywords(text: string): string {
  const norm = normalizeSearchString(text);
  const tokens = norm.split(/\s+/).filter(Boolean);
  const meaningful = tokens.filter((t) => !STOP_WORDS.has(t));

  if (meaningful.length >= 1) {
    return meaningful.join(" ");
  }
  return norm;
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
function filterByVisibleTokens(
  movies: TMDBMovieRaw[],
  tokens: string[],
  cleanQuery: string,
  hasTrailingSpace: boolean = false
): TMDBMovieRaw[] {
  if (tokens.length === 0) return movies;

  const rawQ = normalizeSearchString(cleanQuery);
  const isTrailingSpace = hasTrailingSpace || /\s$/.test(cleanQuery);

  const tokenMatchers = tokens.map((token, index) => {
    const isLastToken = index === tokens.length - 1;
    // Se o token estiver sendo digitado ativamente no final (sem espaço subsequente),
    // o usuário pode estar no meio de uma palavra (ex: "101 da" -> Dálmatas, "de" -> Deadpool).
    // Nesses casos, aceita prefixo de palavra.
    // Apenas se houver espaço no final ("101 da ") ou se o token estiver no meio da frase ("a casa de papel"),
    // aplicamos a fronteira estrita de stop word (\bda\b, \bde\b).
    const isStopWord = STOP_WORDS.has(token.toLowerCase());
    const treatAsStrictStopWord = isStopWord && (!isLastToken || isTrailingSpace);

    const isAscii = /^[\x20-\x7E]+$/.test(token);
    if (isAscii) {
      const escaped = escapeRegex(token);
      const pattern = treatAsStrictStopWord ? `\\b${escaped}\\b` : `\\b${escaped}`;
      const regex = new RegExp(pattern, "i");
      return (text: string) => regex.test(text);
    }
    return (text: string) => text.includes(token);
  });

  return movies.filter((m) => {
    const titleNorm = normalizeSearchString(m.title || "");
    const origNorm = normalizeSearchString(m.original_title || "");

    // 1. Visibilidade Direta em Português: o termo existe no título que o usuário lê na tela
    const matchPt = tokenMatchers.every((matcher) => matcher(titleNorm));
    if (matchPt) return true;

    // 2. Se o título em português NÃO contém o termo, só aceita o título original em inglês se:
    const matchOrig = tokenMatchers.every((matcher) => matcher(origNorm));
    if (!matchOrig) return false;

    const origStrip = stripLeadingArticles(origNorm);

    // Se for termo de 1 única palavra (ex: "doom", "jaws", "alien"):
    // Só aprova se o título em inglês for exatamente a obra buscada (match exato)
    if (tokens.length === 1) {
      return origNorm === rawQ || origStrip === rawQ;
    }

    // Se for termo composto (ex: "fight club", "temple of doom", "foo fighters"):
    // Aceita se o título em inglês contiver a frase contígua ou todos os tokens com prefixo
    return origNorm.includes(rawQ) || origStrip.includes(rawQ) || matchOrig;
  });
}

/**
 * Avalia se o filme corresponde com exatidão homônima ao termo pesquisado
 * (no título localizado em português, no título original, ou sem artigos gramaticais iniciais).
 * Centraliza a checagem evitando drift entre poda de catálogo e pontuação de relevância.
 */
export function isTitleExactMatch(
  title: string,
  originalTitle: string | undefined,
  rawQ: string,
  cleanQ: string
): boolean {
  const norm = normalizeSearchString(title);
  const strip = stripLeadingArticles(norm);
  const clean = cleanFranchiseName(title);
  const origNorm = originalTitle ? normalizeSearchString(originalTitle) : "";
  const origStrip = stripLeadingArticles(origNorm);
  const cleanOrig = originalTitle ? cleanFranchiseName(originalTitle) : "";

  return (
    norm === rawQ ||
    strip === rawQ ||
    clean === cleanQ ||
    (origNorm ? origNorm === rawQ || origStrip === rawQ || cleanOrig === cleanQ : false)
  );
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

      const isExactMatch = isTitleExactMatch(m.title, m.originalTitle, rawQ, cleanQ);

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

    const isExact = isTitleExactMatch(m.title, m.originalTitle, rawQ, cleanQ);
    let relevance = 0;

    // 1. Título idêntico homônimo (ex: "Sim Senhor" ao buscar "sim senhor", "Wonder Woman 1984", "La La Land")
    if (isExact) {
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
    else if (new RegExp(`\\b${escapeRegex(rawQ)}\\b`, "i").test(titleNorm)) {
      relevance = 250;
    }
    // 4. Prefixo de palavra correspondente no título visível em português (ex: "foo fighter" -> "Foo Fighters")
    else if (new RegExp(`\\b${escapeRegex(rawQ)}`, "i").test(titleNorm)) {
      relevance = 200;
    }
    // 5. Palavra inteira ou prefixo no título original em inglês (termo não visível em português)
    else if (origNorm && new RegExp(`\\b${escapeRegex(rawQ)}`, "i").test(origNorm)) {
      relevance = 150;
    }

    // 5. Score Bayesiano de Popularidade, Votos e Qualidade
    const v = m.voteCount || 0;
    const R = m.voteAverage || 0;
    const pop = m.popularity || 0;

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
    // 1. Se ambos são exatos ou ambos são parciais, o score bayesiano desempata
    if (a.isExact === b.isExact) {
      return b.score - a.score;
    }

    // 2. Se um é exato e o outro é parcial:
    // O exato tem grande vantagem (+400 de relevância base).
    // No entanto, se o filme parcial for um fenômeno de autoridade colossal (ex: O Cavaleiro das Trevas com 35k votos)
    // contra uma obra homônima obscura de 20 votos (ex: serial de 1943), a pontuação bayesiana total é que decide.
    return b.score - a.score;
  });

  const sorted = scored.map((s) => s.movie);
  return pruneSearchResults(sorted, normalizedQuery);
}

/**
 * Serviço de Busca Global do Cinera.
 * Integra busca textual, reconciliação com as Coleções oficiais do TMDB
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

  const normalizedBase = normalizeSearchString(sanitized);
  const spelledQuery = canonicalizeSpelling(normalizedBase);
  const normalizedQuery = stripLeadingArticles(spelledQuery);
  const unaccentedQuery = spelledQuery;

  // Se a query normalizada for vazia ou menor que o tamanho mínimo (ex: "the", "os", "!!")
  if (normalizedQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
    return { movies: [] };
  }

  const apiSearchTerm = extractSearchKeywords(spelledQuery);

  // 1. Execução contra a API oficial de filmes do TMDB (/search/movie e /search/collection)
  if (isApiEnabled()) {
    try {
      const moviePath = `/search/movie?query=${encodeURIComponent(unaccentedQuery)}&language=pt-BR&include_adult=false`;
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
      const hasTrailingSpace = /\s$/.test(rawQuery);
      const visibleTokens = unaccentedQuery.split(/\s+/).filter((t) => t.length >= 2);
      const tokenFilteredMovies = filterByVisibleTokens(validMovies, visibleTokens, unaccentedQuery, hasTrailingSpace);

      // 2. Verifica se a busca casa com uma Coleção Canônica Oficial (ex: Star Wars, Senhor dos Anéis, Predador)
      let canonicalCollectionMovies: TMDBMovieRaw[] = [];
      const NOISE_COLLECTION_WORDS = ["animado", "animated", "lego", "especial", "seasonal", "parodia", "parody"];

      // Uma coleção só pode ser avaliada se a query for substancial (pelo menos 2 caracteres limpos)
      if (spelledQuery.length >= 2 && collectionData?.results?.length) {
        const normCleanQuery = normalizeSearchString(spelledQuery);
        const candidateCols = collectionData.results.filter((col) => {
          const colClean = cleanFranchiseName(col.name || "");
          const origClean = cleanFranchiseName(col.original_name || "");
          return !NOISE_COLLECTION_WORDS.some(
            (w) => (colClean.includes(w) || origClean.includes(w)) && !normCleanQuery.includes(w)
          );
        });

        const canonicalMovieIds = new Set<number>();
        const normQ = stripLeadingArticles(normCleanQuery);
        const queryTokensCount = normQ.split(/\s+/).filter(Boolean).length;

        const candidateEntries = candidateCols.slice(0, 5).map((candidateCol) => {
          const isDirectMatch = matchFranchise(candidateCol.name || "", candidateCol.original_name, spelledQuery);

          // Extração da Raiz Nominal da Franquia (delimitador ':', ' - ' ou parênteses)
          const baseNamePt = (candidateCol.name || "").split(/:|\s+-\s+|\s*\(/)[0];
          const baseNameOrig = (candidateCol.original_name || "").split(/:|\s+-\s+|\s*\(/)[0];
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

          // Prefixo de saga:
          // Se o usuário já digitou >= 75% da raiz da franquia (ex: "dun" para "duna" / "dune" = 75% de cobertura),
          // o motor reconhece o prefixo contíguo do nome da saga.
          const isPredictivePrefix =
            (stripCandidate.length > 0 && stripCandidate.startsWith(normQ)) ||
            (stripOrigCandidate.length > 0 && stripOrigCandidate.startsWith(normQ)) ||
            (cleanRootPt.length > 0 && cleanRootPt.startsWith(normQ)) ||
            (cleanRootOrig.length > 0 && cleanRootOrig.startsWith(normQ));
          const maxTargetLen = Math.max(
            cleanRootPt.length || stripCandidate.length,
            cleanRootOrig.length || stripOrigCandidate.length
          );
          const coverage = maxTargetLen > 0 ? normQ.length / maxTargetLen : 0;
          const isPredictiveMatch =
            isPredictivePrefix && (queryTokensCount >= 2 || normQ.length >= 3) && coverage >= 0.75;

          // Regra Universal de Franquia Irmã / Eras de Reboots (ex: Homem-Aranha, Batman):
          // Só qualifica se a coleção cobrir substantivamente o termo do usuário ou for match direto de raiz
          const enSynonym = getCognateSynonym(normQ);
          const isFranchiseVariant =
            queryTokensCount >= 2 &&
            coverage >= 0.7 &&
            (stripCandidate.includes(normQ) ||
              cleanCandidate.includes(normQ) ||
              (enSynonym ? stripOrigCandidate.includes(enSynonym) || origCandidate.includes(enSynonym) : false));

          const isCandidateToInspect =
            isDirectMatch ||
            isRootMatch ||
            isPredictiveMatch ||
            isFranchiseVariant;

          return {
            candidateCol,
            isDirectMatch,
            isRootMatch,
            isPredictiveMatch,
            isFranchiseVariant,
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

          // Regra de Ouro 1: Uma coleção só é considerada franquia/saga se tiver pelo menos 2 filmes lançados
          if (parts.length < 2) continue;

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

            const hasEstablishedAuthority = totalVotes >= 10000;
            const hasSevereExternalMonopoly = maxExternalVotes > maxPartVotes * 3;

            if (!hasEstablishedAuthority && hasSevereExternalMonopoly) {
              continue;
            }
          }

          // Busca dinâmica de cognato internacional para unir eras e reboots
          const enSynonym = getCognateSynonym(normQ);
          const isSisterFranchise =
            entry.isFranchiseVariant ||
            (enSynonym ? entry.stripOrigCandidate.includes(enSynonym) || entry.cleanRootOrig.includes(enSynonym) : false);

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
      // Apenas engole silenciosamente se o cancelamento foi intencional do usuário (digitando outra query)
      if (err instanceof Error && err.name === "AbortError" && signal?.aborted) {
        return { movies: [] };
      }
      console.warn(`Falha na busca remota para "${rawQuery}":`, err);
      // Se for timeout de 10s ou erro de rede real, relança para a UI exibir tela de erro e botão 'tentar novamente'
      throw err;
    }
  }

  // 4. Sem chaves do TMDB: modo demonstração, com filmes de exemplo carregados sob demanda
  const { demoMovies } = await import("../demo/demo-data");
  const now = Date.now();
  const localResults = demoMovies.filter((m) => {
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
