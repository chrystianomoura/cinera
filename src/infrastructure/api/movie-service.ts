import type { Movie, MovieCredits, MovieWatchProviders, PaginatedResponse } from '@/domain';
import { moviesMock, creditsMock, providersMock } from '../mock/movies.mock';
import { fetchFromTMDB, isTmdbConfigured, getPosterUrl, getBackdropUrl, getProfileUrl } from './tmdb-client';
import { mapTMDBMovie, mapTMDBCredits, mapTMDBWatchProviders } from './tmdb-mappers';
import { filterQualifiedMovies, dedupeFranchises, getFranchiseKey } from './curation-filters';
import { fetchGenreMoviesPage } from './genre-discovery.service';
import type {
  TMDBMovieRaw,
  TMDBPaginatedResponse,
  TMDBCreditsRaw,
  TMDBProvidersResponse,
  TMDBReleaseDatesResponse,
  TMDBImagesResponse,
  MovieVideo,
} from './tmdb-types';

// Re-exporta utilitários e tipos para 100% de compatibilidade retroativa
export {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  filterQualifiedMovies,
  getFranchiseKey,
  dedupeFranchises,
};
export { TMDB_GENRE_MAP } from './tmdb-types';
export type { MovieVideo } from './tmdb-types';

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
      if (isTmdbConfigured()) {
        const pagesToFetch = page === 1 ? [1, 2] : [page];
        const responses = await Promise.all(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/trending/movie/day?language=pt-BR&page=${p}`
            )
          )
        );

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 6.0, 30);

        return {
          page,
          results: qualified,
          totalPages: responses[0]?.total_pages ?? 1,
          totalResults: responses[0]?.total_results ?? qualified.length,
        };
      }
    } catch (error) {
      console.warn('Falha ao obter filmes em tendência do TMDB, usando fallback mock:', error);
    }

    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const results = filterQualifiedMovies(moviesMock.slice(startIndex, endIndex), 5.5, 5);

    return {
      page,
      results,
      totalPages: Math.ceil(moviesMock.length / itemsPerPage),
      totalResults: moviesMock.length,
    };
  }

  /**
   * Retorna filmes em destaque para o Hero com critérios rígidos:
   * Backdrop horizontal, nota IMDb mínima, votos reais e tagline oficial.
   */
  async getHeroFeaturedMovies(): Promise<Movie[]> {
    try {
      if (isTmdbConfigured()) {
        const trending = await this.getTrendingMovies(1);

        let candidates = trending.results.filter(
          (m) => Boolean(m.backdropPath && m.voteAverage >= 7.0 && m.voteCount >= 10)
        );

        if (candidates.length < 3) {
          candidates = trending.results.filter(
            (m) => Boolean(m.backdropPath && m.voteAverage >= 6.5 && m.voteCount >= 10)
          );
        }

        const detailedMovies = await Promise.all(
          candidates.slice(0, 5).map((m) => this.getMovieById(m.id))
        );

        const heroValid = detailedMovies.filter(
          (m): m is Movie => Boolean(m && m.tagline && m.tagline.trim().length > 0)
        );

        if (heroValid.length >= 3) {
          return heroValid;
        }

        const validCandidates = detailedMovies.filter((m): m is Movie => Boolean(m));
        if (validCandidates.length > 0) {
          return validCandidates;
        }
      }
    } catch (error) {
      console.warn('Falha ao obter filmes em destaque para o Hero:', error);
    }

    return moviesMock.filter((m) => Boolean(m.tagline && m.tagline.trim().length > 0));
  }

  /**
   * Procura um filme específico pelo seu ID.
   */
  async getMovieById(id: number): Promise<Movie | null> {
    try {
      if (isTmdbConfigured()) {
        const raw = await fetchFromTMDB<TMDBMovieRaw>(`/movie/${id}?language=pt-BR`);
        return mapTMDBMovie(raw);
      }
    } catch (error) {
      console.warn(`Falha ao obter filme ${id} do TMDB:`, error);
    }

    return moviesMock.find((m) => m.id === id) || null;
  }

  /**
   * Retorna os créditos de um filme.
   */
  async getMovieCredits(id: number): Promise<MovieCredits | null> {
    try {
      if (isTmdbConfigured()) {
        const data = await fetchFromTMDB<TMDBCreditsRaw>(`/movie/${id}/credits?language=pt-BR`);
        return mapTMDBCredits(data);
      }
    } catch (error) {
      console.warn(`Falha ao obter créditos do filme ${id} do TMDB:`, error);
    }

    return creditsMock[id] || null;
  }

  /**
   * Retorna os provedores onde o filme está disponível.
   */
  async getMovieWatchProviders(id: number): Promise<MovieWatchProviders | null> {
    try {
      if (isTmdbConfigured()) {
        const data = await fetchFromTMDB<TMDBProvidersResponse>(`/movie/${id}/watch/providers`);
        return mapTMDBWatchProviders(data);
      }
    } catch (error) {
      console.warn(`Falha ao obter provedores de streaming do filme ${id} do TMDB:`, error);
    }

    return providersMock[id] || null;
  }

  /**
   * Procura filmes por um termo de pesquisa no TMDB.
   */
  async searchMovies(query: string, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isTmdbConfigured() && query.trim()) {
        const data = await fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
          `/search/movie?query=${encodeURIComponent(query)}&language=pt-BR&page=${page}&include_adult=false`
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
    }

    const normalizedQuery = query.toLowerCase();
    const filteredMovies = moviesMock.filter(
      (movie) =>
        movie.title.toLowerCase().includes(normalizedQuery) ||
        (movie.originalTitle && movie.originalTitle.toLowerCase().includes(normalizedQuery))
    );

    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const results = filteredMovies.slice(startIndex, endIndex);

    return {
      page,
      results,
      totalPages: Math.ceil(filteredMovies.length / itemsPerPage),
      totalResults: filteredMovies.length,
    };
  }

  /**
   * Retorna lançamentos autênticos e novidades do ano corrente com alta relevância.
   */
  async getNewReleasesMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isTmdbConfigured()) {
        const currentYear = new Date().getFullYear();
        const pagesToFetch = page === 1 ? [1, 2, 3] : [page];
        const responses = await Promise.all(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&sort_by=popularity.desc&primary_release_date.gte=${currentYear}-01-01&vote_count.gte=30&vote_average.gte=6.0&page=${p}`
            )
          )
        );

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 6.0, 30);

        return {
          page,
          results: qualified,
          totalPages: responses[0]?.total_pages ?? 1,
          totalResults: responses[0]?.total_results ?? qualified.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter novidades do TMDB:", error);
    }

    const currentYear = new Date().getFullYear();
    const newReleases = moviesMock.filter((m) => {
      const year = new Date(m.releaseDate).getFullYear();
      return year >= currentYear - 1;
    });
    const results = filterQualifiedMovies(newReleases.length > 0 ? newReleases : moviesMock, 5.5, 5);
    return {
      page,
      results,
      totalPages: 1,
      totalResults: results.length,
    };
  }

  /**
   * Alias de compatibilidade para lançamentos.
   */
  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.getNewReleasesMovies(page);
  }

  /**
   * Retorna os filmes aclamados pela crítica contemporânea (Século XXI: 2000 em diante).
   */
  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isTmdbConfigured()) {
        const pagesToFetch = page === 1 ? [1, 2, 3] : [page];
        const responses = await Promise.all(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&sort_by=vote_average.desc&vote_count.gte=2000&primary_release_date.gte=2000-01-01&without_genres=16&page=${p}`
            )
          )
        );

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 7.5, 500);
        const franchiseChampionOnly = dedupeFranchises(qualified);

        return {
          page,
          results: franchiseChampionOnly,
          totalPages: responses[0]?.total_pages ?? 1,
          totalResults: responses[0]?.total_results ?? franchiseChampionOnly.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter filmes mais bem avaliados do TMDB:", error);
    }

    const contemporary = moviesMock
      .filter((m) => {
        const year = new Date(m.releaseDate).getFullYear();
        const isNotAnimation = !m.genres?.some((g) => g.id === 16 || g.name === "Animação");
        return year >= 2000 && isNotAnimation;
      })
      .sort((a, b) => b.voteAverage - a.voteAverage);
    const results = dedupeFranchises(
      filterQualifiedMovies(contemporary.length > 0 ? contemporary : moviesMock, 6.0, 10)
    );
    return {
      page,
      results,
      totalPages: 1,
      totalResults: results.length,
    };
  }

  /**
   * Retorna os clássicos indispensáveis da história do cinema (até 1999).
   */
  async getClassicMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isTmdbConfigured()) {
        const pagesToFetch = page === 1 ? [1, 2, 3] : [page];
        const responses = await Promise.all(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/discover/movie?language=pt-BR&sort_by=vote_average.desc&vote_count.gte=3000&primary_release_date.lte=1999-12-31&without_genres=16&page=${p}`
            )
          )
        );

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 7.5, 1000);
        const franchiseChampionOnly = dedupeFranchises(qualified);

        return {
          page,
          results: franchiseChampionOnly,
          totalPages: responses[0]?.total_pages ?? 1,
          totalResults: responses[0]?.total_results ?? franchiseChampionOnly.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter clássicos do cinema do TMDB:", error);
    }

    const classics = moviesMock
      .filter((m) => {
        const year = new Date(m.releaseDate).getFullYear();
        const isNotAnimation = !m.genres?.some((g) => g.id === 16 || g.name === "Animação");
        return year <= 1999 && isNotAnimation;
      })
      .sort((a, b) => b.voteAverage - a.voteAverage);
    const results = dedupeFranchises(
      filterQualifiedMovies(classics.length > 0 ? classics : moviesMock, 6.0, 10)
    );
    return {
      page,
      results,
      totalPages: 1,
      totalResults: results.length,
    };
  }

  /**
   * Retorna os filmes populares com alta adesão de público.
   */
  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (isTmdbConfigured()) {
        const pagesToFetch = page === 1 ? [1, 2, 3, 4, 5] : [page];
        const responses = await Promise.all(
          pagesToFetch.map((p) =>
            fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
              `/movie/popular?language=pt-BR&page=${p}`
            )
          )
        );

        const allRaw = responses.flatMap((r) => r.results);
        const mapped = allRaw.map(mapTMDBMovie);
        const qualified = filterQualifiedMovies(mapped, 6.0, 30);

        return {
          page,
          results: qualified,
          totalPages: responses[0]?.total_pages ?? 1,
          totalResults: responses[0]?.total_results ?? qualified.length,
        };
      }
    } catch (error) {
      console.warn("Falha ao obter filmes populares do TMDB:", error);
    }

    const popular = [...moviesMock].sort((a, b) => b.voteCount - a.voteCount);
    const results = filterQualifiedMovies(popular, 6.0, 10);
    return {
      page,
      results,
      totalPages: 1,
      totalResults: results.length,
    };
  }

  /**
   * Retorna filmes filtrados por macrogênero com curadoria editorial e busca paralela.
   */
  async getMoviesByGenre(
    categoryOrQuery: string | number,
    page: number = 1
  ): Promise<PaginatedResponse<Movie>> {
    return fetchGenreMoviesPage(categoryOrQuery, page);
  }

  /**
   * Retorna os vídeos e trailers de um filme.
   */
  async getMovieVideos(id: number): Promise<MovieVideo[]> {
    try {
      if (isTmdbConfigured()) {
        let data = await fetchFromTMDB<{ id: number; results: MovieVideo[] }>(
          `/movie/${id}/videos?language=pt-BR`
        );

        if (!data.results || data.results.length === 0) {
          data = await fetchFromTMDB<{ id: number; results: MovieVideo[] }>(
            `/movie/${id}/videos?language=en-US`
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
      if (isTmdbConfigured()) {
        const data = await fetchFromTMDB<TMDBReleaseDatesResponse>(
          `/movie/${id}/release_dates`
        );

        const brData = data.results?.find((r) => r.iso_3166_1 === "BR");
        if (brData) {
          const cert = brData.release_dates.find((d) => Boolean(d.certification?.trim()));
          if (cert?.certification) {
            return cert.certification.trim();
          }
        }

        // Fallback para classificação norte-americana (US)
        const usData = data.results?.find((r) => r.iso_3166_1 === "US");
        if (usData) {
          const cert = usData.release_dates.find((d) => Boolean(d.certification?.trim()));
          if (cert?.certification) {
            return cert.certification.trim();
          }
        }
      }
    } catch (error) {
      console.warn(`Falha ao obter classificação indicativa do filme ${id}:`, error);
    }
    return null;
  }

  /**
   * Retorna a galeria de fotos widescreen/stills das filmagens do filme.
   */
  async getMovieGalleryImages(id: number): Promise<string[]> {
    try {
      if (isTmdbConfigured()) {
        const data = await fetchFromTMDB<TMDBImagesResponse>(
          `/movie/${id}/images`
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