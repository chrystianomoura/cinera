import type { Movie, PaginatedResponse } from '@/domain';
import { GENRE_PROFILES, type GenreProfile } from '@/features/catalog/constants';
import { moviesMock } from '../mock/movies.mock';
import { fetchFromTMDB, isTmdbConfigured } from './tmdb-client';
import { mapTMDBMovie } from './tmdb-mappers';
import { filterQualifiedMovies } from './curation-filters';
import type { TMDBMovieRaw, TMDBPaginatedResponse } from './tmdb-types';

/**
 * Retorna filmes filtrados por macrogênero de streaming (suporta união com '|', ex: '28|12').
 * Aplica critérios rigorosos de qualidade:
 * - Cartaz oficial obrigatório (posterPath != null)
 * - Avaliação mínima e contagem de votos calibradas por perfil editorial
 * - Curadoria editorial por perfil de gênero (GenreProfile)
 * - Exclusão cruzada (without_genres e without_keywords) para eliminar contaminação
 * - Ordenação sob medida (sortBy)
 * - Heurística de afinidade: prioridade para 1ª e 2ª tags; resgate na 3ª tag para notas >= 7.0 e votos >= 200
 * - Busca paralela concorrente via Promise.allSettled
 * - Priorização de filmes com o gênero solicitado como primeira tag
 */
export async function fetchGenreMoviesPage(
  categoryOrQuery: string | number,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  try {
    if (isTmdbConfigured()) {
      const inputKey = String(categoryOrQuery).trim();

      // Localiza o perfil editorial da categoria (seja pelo nome "Comédia" ou pelo ID/Query "35")
      let profile: GenreProfile | undefined = GENRE_PROFILES[inputKey];
      if (!profile) {
        // Busca reversa caso tenha sido passado o ID legado (ex: "35" ou "28|12")
        profile = Object.values(GENRE_PROFILES).find(
          (p) => p.withGenres === inputKey
        );
      }

      // Perfil de fallback caso seja um gênero avulso desconhecido
      const effectiveProfile: GenreProfile = profile || {
        withGenres: inputKey,
        withoutGenres: inputKey.includes("16") ? undefined : "16",
        sortBy: "popularity.desc",
        minVoteAverage: 6.0,
        minVoteCount: 30,
        description: "Explorando os títulos deste gênero",
      };

      const withoutParam = effectiveProfile.withoutGenres
        ? `&without_genres=${effectiveProfile.withoutGenres}`
        : "";
      const withoutKeywordsParam = effectiveProfile.withoutKeywords
        ? `&without_keywords=${effectiveProfile.withoutKeywords}`
        : "";
      const sortParam = `&sort_by=${effectiveProfile.sortBy || "popularity.desc"}`;
      const minVoteCount = effectiveProfile.minVoteCount || 30;
      const minVoteAvg = effectiveProfile.minVoteAverage || 6.0;
      const targetGenreIds = new Set(
        String(effectiveProfile.withGenres).split("|").map(Number)
      );

      let currentTmdbPage = page;
      const collectedMovies: Movie[] = [];
      let totalPages = Infinity;
      let totalResults = 0;
      const targetBatchCount = 18;
      let chunksFetched = 0;
      const maxChunks = 2; // Até 4 páginas em paralelo por lote

      while (
        collectedMovies.length < targetBatchCount &&
        currentTmdbPage <= totalPages &&
        chunksFetched < maxChunks
      ) {
        const pagesToFetch = [currentTmdbPage];
        if (currentTmdbPage + 1 <= totalPages) {
          pagesToFetch.push(currentTmdbPage + 1);
        }

        const settledResponses = await Promise.allSettled(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&with_genres=${effectiveProfile.withGenres}${withoutParam}${withoutKeywordsParam}${sortParam}&vote_count.gte=${minVoteCount}&vote_average.gte=${minVoteAvg}&page=${p}`
            )
          )
        );

        const pageResponses = settledResponses
          .filter(
            (r): r is PromiseFulfilledResult<TMDBPaginatedResponse<TMDBMovieRaw>> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value);

        for (const data of pageResponses) {
          totalPages = Math.min(totalPages, data.total_pages);
          totalResults = Math.max(totalResults, data.total_results);

          const qualified = filterQualifiedMovies(
            data.results.map(mapTMDBMovie),
            minVoteAvg,
            minVoteCount,
            true // Exige sinopse real em português (filtro anti-trash)
          );

          // Heurística de Afinidade Ponderada:
          // - Posição 1 ou 2: alta afinidade (sempre aprovado)
          // - Posição 3: resgate de obras-primas com alta aclamação (nota >= 7.0 e votos >= 200)
          // - Posição 4 em diante: descartado
          const affinityMovies = qualified.filter((m) => {
            if (!m.genres || m.genres.length === 0) return true;
            const genreIds = m.genres.map((g) => g.id);
            const bestIndex = genreIds.findIndex((id) => targetGenreIds.has(id));
            if (bestIndex === -1) return false;

            if (bestIndex < 2) return true;
            if (bestIndex === 2 && m.voteAverage >= 7.0 && m.voteCount >= 200) {
              return true;
            }
            return false;
          });

          collectedMovies.push(...affinityMovies);
        }

        currentTmdbPage += pagesToFetch.length;
        chunksFetched++;
      }

      // Deduplicação estrita de segurança por ID
      const seenIds = new Set<number>();
      const uniqueMovies: Movie[] = [];
      for (const m of collectedMovies) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          uniqueMovies.push(m);
        }
      }

      // Prioridade editorial: se o filme tem o gênero como primeira tag (identidade principal),
      // ele ganha prioridade no topo do lote preservando a estabilidade da ordenação
      if (effectiveProfile.primaryGenreId) {
        const targetPrimaryId = effectiveProfile.primaryGenreId;
        uniqueMovies.sort((a, b) => {
          const aIsPrimary = a.genres?.[0]?.id === targetPrimaryId ? 1 : 0;
          const bIsPrimary = b.genres?.[0]?.id === targetPrimaryId ? 1 : 0;
          return bIsPrimary - aIsPrimary;
        });
      }

      const hasNext =
        currentTmdbPage <= totalPages &&
        (uniqueMovies.length > 0 || currentTmdbPage < totalPages);

      return {
        page,
        results: uniqueMovies,
        totalPages,
        totalResults,
        nextPage: hasNext ? currentTmdbPage : undefined,
      };
    }
  } catch (error) {
    console.warn(`Falha ao obter filmes do gênero ${categoryOrQuery} do TMDB:`, error);
  }

  // Fallback Mock
  const inputKey = String(categoryOrQuery).trim();
  const profile = GENRE_PROFILES[inputKey];
  const withIds = profile ? profile.withGenres : inputKey;
  const queryIds = new Set(String(withIds).split('|').map(Number));
  const filtered = moviesMock.filter((m) =>
    m.genres?.some((g) => queryIds.has(g.id))
  );
  const results = filterQualifiedMovies(filtered.length > 0 ? filtered : moviesMock, 6.0, 20);
  return {
    page,
    results,
    totalPages: 1,
    totalResults: results.length,
    nextPage: undefined,
  };
}
