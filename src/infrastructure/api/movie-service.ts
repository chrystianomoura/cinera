import type {
  Movie,
  MovieCredits,
  MovieWatchProviders,
  PaginatedResponse,
} from "@/domain";
import {
  fetchFromTMDB,
  isApiEnabled,
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
} from "./tmdb-client";
import {
  mapTMDBMovie,
  mapTMDBCredits,
  mapTMDBWatchProviders,
} from "./tmdb-mappers";
import {
  filterQualifiedMovies,
  dedupeFranchises,
  getFranchiseKey,
} from "./curation-filters";
import { fetchGenreMoviesPage } from "./genre-discovery.service";
import type {
  TMDBMovieRaw,
  TMDBPaginatedResponse,
  TMDBCreditsRaw,
  TMDBProvidersResponse,
  TMDBReleaseDatesResponse,
  TMDBImagesResponse,
  MovieVideo,
} from "./tmdb-types";

// Re-exporta utilitários e tipos para manter os imports existentes
export {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  filterQualifiedMovies,
  getFranchiseKey,
  dedupeFranchises,
};
export { TMDB_GENRE_MAP } from "./tmdb-types";
export type { MovieVideo } from "./tmdb-types";

/** Dados de demonstração só são baixados no modo sem chaves do TMDB (veja infrastructure/demo). */
const loadDemo = () => import("../demo/demo-service");

/**
 * Serviço central de filmes (Fachada do Domínio de Catálogo).
 * Orquestra chamadas de API, curadoria editorial e fallbacks offline.
 */
class MovieService {
  /**
   * Retorna os filmes em tendência do dia com filtro estrito de qualidade.
   */
  async getTrendingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isApiEnabled()) {
        const pagesPerAppPage = 2;
        const startTmdb = (page - 1) * pagesPerAppPage + 1;
        const pagesToFetch = Array.from(
          { length: pagesPerAppPage },
          (_, i) => startTmdb + i,
        );

        const settled = await Promise.allSettled(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/trending/movie/day?language=pt-BR&page=${p}`,
            ),
          ),
        );

        const responses = settled
          .filter(
            (r): r is PromiseFulfilledResult<TMDBPaginatedResponse<TMDBMovieRaw>> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (responses.length === 0) {
          throw new Error("Nenhuma página respondeu para trending");
        }

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 6.0, 30);
        const tmdbTotalPages = responses[0]?.total_pages ?? 1;
        const appTotalPages = Math.max(1, Math.ceil(tmdbTotalPages / pagesPerAppPage));

        return {
          page,
          results: qualified,
          totalPages: appTotalPages,
          totalResults: responses[0]?.total_results ?? qualified.length,
        };
      }
    } catch (error) {
      console.warn(
        "Falha ao obter filmes em tendência do TMDB:",
        error,
      );
      throw error;
    }

    return (await loadDemo()).trending(page);
  }

  /**
   * Retorna filmes em destaque para o Hero com critérios rígidos:
   * Backdrop horizontal, nota TMDB mínima, votos reais e tagline oficial.
   */
  async getHeroFeaturedMovies(): Promise<Movie[]> {
    try {
      if (isApiEnabled()) {
        const trending = await this.getTrendingMovies(1);

        // Funil 1: Backdrop obrigatório, relevância real (mínimo 50 votos) e nota consistente (>= 6.8)
        let candidates = trending.results.filter((m) =>
          Boolean(m.backdropPath && m.voteAverage >= 6.8 && m.voteCount >= 50),
        );

        // Fallback suave apenas se o dia tiver poucos filmes avaliados
        if (candidates.length < 5) {
          candidates = trending.results.filter((m) =>
            Boolean(m.backdropPath && m.voteAverage >= 6.5 && m.voteCount >= 25),
          );
        }

        // Inspeciona até 15 candidatos para garantir os 5 melhores com tagline oficial
        const candidatesToInspect = candidates.slice(0, 15);
        const settledDetailed = await Promise.allSettled(
          candidatesToInspect.map((m) => this.getMovieById(m.id)),
        );
        const detailedMovies = settledDetailed
          .filter(
            (r): r is PromiseFulfilledResult<Movie | null> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        // Filtro ESTRITO: Apenas filmes com tagline oficial válida e não-vazia
        const heroValid = detailedMovies.filter((m): m is Movie =>
          Boolean(m && m.tagline && m.tagline.trim().length > 0),
        );

        if (heroValid.length >= 3) {
          return heroValid.slice(0, 5);
        }
      }
    } catch (error) {
      console.warn("Falha ao obter filmes em destaque para o Hero:", error);
      throw error;
    }

    // Com chaves configuradas, uma resposta insuficiente da API não vira dados de demonstração
    if (isApiEnabled()) return [];
    return (await loadDemo()).hero();
  }

  /**
   * Procura um filme específico pelo seu ID.
   */
  async getMovieById(id: number): Promise<Movie | null> {
    try {
      if (isApiEnabled()) {
        const raw = await fetchFromTMDB<TMDBMovieRaw>(
          `/movie/${id}?language=pt-BR`,
        );
        return mapTMDBMovie(raw);
      }
    } catch (error) {
      console.warn(`Falha ao obter filme ${id} do TMDB:`, error);
      throw error;
    }

    return (await loadDemo()).movieById(id);
  }

  /**
   * Retorna os créditos de um filme.
   */
  async getMovieCredits(id: number): Promise<MovieCredits | null> {
    try {
      if (isApiEnabled()) {
        const data = await fetchFromTMDB<TMDBCreditsRaw>(
          `/movie/${id}/credits?language=pt-BR`,
        );
        return mapTMDBCredits(data);
      }
    } catch (error) {
      console.warn(`Falha ao obter créditos do filme ${id} do TMDB:`, error);
      throw error;
    }

    return (await loadDemo()).credits(id);
  }

  /**
   * Retorna os provedores onde o filme está disponível.
   */
  async getMovieWatchProviders(
    id: number,
  ): Promise<MovieWatchProviders | null> {
    try {
      if (isApiEnabled()) {
        const data = await fetchFromTMDB<TMDBProvidersResponse>(
          `/movie/${id}/watch/providers`,
        );
        return mapTMDBWatchProviders(data);
      }
    } catch (error) {
      console.warn(
        `Falha ao obter provedores de streaming do filme ${id} do TMDB:`,
        error,
      );
      throw error;
    }

    return (await loadDemo()).providers(id);
  }

  /**
   * Procura filmes por um termo de pesquisa no TMDB.
   */
  async searchMovies(
    query: string,
    page: number = 1,
  ): Promise<PaginatedResponse<Movie>> {
    try {
      if (isApiEnabled() && query.trim()) {
        const data = await fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
          `/search/movie?query=${encodeURIComponent(query)}&language=pt-BR&page=${page}&include_adult=false`,
        );

        return {
          page: data.page,
          results: data.results.map(mapTMDBMovie),
          totalPages: data.total_pages,
          totalResults: data.total_results,
        };
      }
    } catch (error) {
      console.warn(`Falha ao pesquisar filmes no TMDB para "${query}":`, error);
      throw error;
    }

    if (isApiEnabled()) return { page, results: [], totalPages: 0, totalResults: 0 };
    return (await loadDemo()).search(query, page);
  }

  /**
   * Retorna lançamentos autênticos e novidades do ano corrente com alta relevância.
   */
  async getNewReleasesMovies(
    page: number = 1,
  ): Promise<PaginatedResponse<Movie>> {
    try {
      if (isApiEnabled()) {
        const currentYear = new Date().getFullYear();
        const pagesPerAppPage = 3;
        const startTmdb = (page - 1) * pagesPerAppPage + 1;
        const pagesToFetch = Array.from(
          { length: pagesPerAppPage },
          (_, i) => startTmdb + i,
        );

        const settled = await Promise.allSettled(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&sort_by=popularity.desc&primary_release_date.gte=${currentYear}-01-01&vote_count.gte=30&vote_average.gte=6.0&page=${p}`,
            ),
          ),
        );

        const responses = settled
          .filter(
            (r): r is PromiseFulfilledResult<TMDBPaginatedResponse<TMDBMovieRaw>> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (responses.length === 0) {
          throw new Error("Nenhuma página respondeu para lançamentos");
        }

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 6.0, 30);
        const tmdbTotalPages = responses[0]?.total_pages ?? 1;
        const appTotalPages = Math.max(1, Math.ceil(tmdbTotalPages / pagesPerAppPage));

        return {
          page,
          results: qualified,
          totalPages: appTotalPages,
          totalResults: responses[0]?.total_results ?? qualified.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter novidades do TMDB:", error);
      throw error;
    }

    return (await loadDemo()).newReleases();
  }

  /**
   * Alias de compatibilidade para lançamentos.
   */
  async getNowPlayingMovies(
    page: number = 1,
  ): Promise<PaginatedResponse<Movie>> {
    return this.getNewReleasesMovies(page);
  }

  /**
   * Retorna os filmes aclamados pela crítica contemporânea (Século XXI: 2000 em diante).
   */
  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isApiEnabled()) {
        const pagesPerAppPage = 3;
        const startTmdb = (page - 1) * pagesPerAppPage + 1;
        const pagesToFetch = Array.from(
          { length: pagesPerAppPage },
          (_, i) => startTmdb + i,
        );

        const settled = await Promise.allSettled(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&sort_by=vote_average.desc&vote_count.gte=2000&primary_release_date.gte=2000-01-01&without_genres=16&page=${p}`,
            ),
          ),
        );

        const responses = settled
          .filter(
            (r): r is PromiseFulfilledResult<TMDBPaginatedResponse<TMDBMovieRaw>> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (responses.length === 0) {
          throw new Error("Nenhuma página respondeu para top-rated");
        }

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 7.5, 500);
        const franchiseChampionOnly = dedupeFranchises(qualified);
        const tmdbTotalPages = responses[0]?.total_pages ?? 1;
        const appTotalPages = Math.max(1, Math.ceil(tmdbTotalPages / pagesPerAppPage));

        return {
          page,
          results: franchiseChampionOnly,
          totalPages: appTotalPages,
          totalResults:
            responses[0]?.total_results ?? franchiseChampionOnly.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter filmes mais bem avaliados do TMDB:", error);
      throw error;
    }

    return (await loadDemo()).topRated();
  }

  /**
   * Retorna os clássicos indispensáveis da história do cinema (até 1999).
   */
  async getClassicMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isApiEnabled()) {
        const pagesPerAppPage = 3;
        const startTmdb = (page - 1) * pagesPerAppPage + 1;
        const pagesToFetch = Array.from(
          { length: pagesPerAppPage },
          (_, i) => startTmdb + i,
        );

        const settled = await Promise.allSettled(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&sort_by=vote_average.desc&vote_count.gte=3000&primary_release_date.lte=1999-12-31&without_genres=16&page=${p}`,
            ),
          ),
        );

        const responses = settled
          .filter(
            (r): r is PromiseFulfilledResult<TMDBPaginatedResponse<TMDBMovieRaw>> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (responses.length === 0) {
          throw new Error("Nenhuma página respondeu para clássicos");
        }

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 7.5, 1000);
        const franchiseChampionOnly = dedupeFranchises(qualified);
        const tmdbTotalPages = responses[0]?.total_pages ?? 1;
        const appTotalPages = Math.max(1, Math.ceil(tmdbTotalPages / pagesPerAppPage));

        return {
          page,
          results: franchiseChampionOnly,
          totalPages: appTotalPages,
          totalResults:
            responses[0]?.total_results ?? franchiseChampionOnly.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter clássicos do cinema do TMDB:", error);
      throw error;
    }

    return (await loadDemo()).classics();
  }

  /**
   * Retorna os filmes populares com alta adesão de público.
   */
  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isApiEnabled()) {
        const pagesPerAppPage = 5;
        const startTmdb = (page - 1) * pagesPerAppPage + 1;
        const pagesToFetch = Array.from(
          { length: pagesPerAppPage },
          (_, i) => startTmdb + i,
        );

        const settled = await Promise.allSettled(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/movie/popular?language=pt-BR&page=${p}`,
            ),
          ),
        );

        const responses = settled
          .filter(
            (r): r is PromiseFulfilledResult<TMDBPaginatedResponse<TMDBMovieRaw>> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (responses.length === 0) {
          throw new Error("Nenhuma página respondeu para populares");
        }

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 6.0, 30);
        const tmdbTotalPages = responses[0]?.total_pages ?? 1;
        const appTotalPages = Math.max(1, Math.ceil(tmdbTotalPages / pagesPerAppPage));

        return {
          page,
          results: qualified,
          totalPages: appTotalPages,
          totalResults: responses[0]?.total_results ?? qualified.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter filmes populares do TMDB:", error);
      throw error;
    }

    return (await loadDemo()).popular();
  }

  /**
   * Retorna filmes filtrados por macrogênero com curadoria editorial e busca paralela.
   */
  async getMoviesByGenre(
    categoryOrQuery: string | number,
    page: number = 1,
  ): Promise<PaginatedResponse<Movie>> {
    return fetchGenreMoviesPage(categoryOrQuery, page);
  }

  /**
   * Retorna os vídeos e trailers de um filme.
   */
  async getMovieVideos(id: number): Promise<MovieVideo[]> {
    try {
      if (isApiEnabled()) {
        let data = await fetchFromTMDB<{ id: number; results: MovieVideo[] }>(
          `/movie/${id}/videos?language=pt-BR`,
        );

        if (!data.results || data.results.length === 0) {
          data = await fetchFromTMDB<{ id: number; results: MovieVideo[] }>(
            `/movie/${id}/videos?language=en-US`,
          );
        }

        return data.results || [];
      }
    } catch (error) {
      console.warn(`Falha ao obter vídeos do filme ${id} do TMDB:`, error);
    }
    return [];
  }

  /**
   * Retorna a classificação indicativa do filme (prioridade para o Brasil - BR).
   */
  async getMovieReleaseDates(id: number): Promise<string | null> {
    try {
      if (isApiEnabled()) {
        const data = await fetchFromTMDB<TMDBReleaseDatesResponse>(
          `/movie/${id}/release_dates`,
        );

        const brData = data.results?.find((r) => r.iso_3166_1 === "BR");
        if (brData) {
          const cert = brData.release_dates.find((d) =>
            Boolean(d.certification?.trim()),
          );
          if (cert?.certification) {
            return cert.certification.trim();
          }
        }

        // Fallback para classificação norte-americana (US)
        const usData = data.results?.find((r) => r.iso_3166_1 === "US");
        if (usData) {
          const cert = usData.release_dates.find((d) =>
            Boolean(d.certification?.trim()),
          );
          if (cert?.certification) {
            return cert.certification.trim();
          }
        }
      }
    } catch (error) {
      console.warn(
        `Falha ao obter classificação indicativa do filme ${id}:`,
        error,
      );
    }
    return null;
  }

  /**
   * Retorna a galeria de fotos widescreen/stills das filmagens do filme.
   */
  async getMovieGalleryImages(id: number): Promise<string[]> {
    try {
      if (isApiEnabled()) {
        const data = await fetchFromTMDB<TMDBImagesResponse>(
          `/movie/${id}/images`,
        );
        const backdrops = data.backdrops || [];
        return backdrops
          .filter((b) => Boolean(b.file_path))
          .slice(0, 12)
          .map((b) => b.file_path);
      }
    } catch (error) {
      console.warn(`Falha ao obter galeria de imagens do filme ${id}:`, error);
    }
    return [];
  }
}

export const movieService = new MovieService();
