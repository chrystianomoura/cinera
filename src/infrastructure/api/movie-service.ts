import type { Movie, MovieCredits, MovieWatchProviders, PaginatedResponse } from '@/domain';
import { moviesMock, creditsMock, providersMock } from '../mock/movies.mock';

/**
 * Utilitário para simular latência de rede.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gera um tempo de latência aleatório entre 250ms e 350ms.
 */
const randomLatency = () => Math.floor(Math.random() * 100) + 250;

/**
 * Função utilitária para obter o URL do poster do filme no TMDB.
 */
export const getPosterUrl = (path: string | null, size: 'w342' | 'w500' | 'w780' = 'w500'): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Função utilitária para obter o URL do backdrop (imagem de fundo) do filme no TMDB.
 */
export const getBackdropUrl = (path: string | null, size: 'w780' | 'w1280' | 'original' = 'original'): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Função utilitária para obter o URL da foto de perfil de membros do elenco ou equipa no TMDB.
 */
export const getProfileUrl = (path: string | null, size: 'w185' | 'h632' = 'w185'): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Classe responsável pelas chamadas de API simuladas para o domínio de filmes.
 */
class MovieService {
  /**
   * Retorna os filmes em tendência (mock).
   */
  async getTrendingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    await delay(randomLatency());

    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const results = moviesMock.slice(startIndex, endIndex);

    return {
      page,
      results,
      totalPages: Math.ceil(moviesMock.length / itemsPerPage),
      totalResults: moviesMock.length,
    };
  }

  /**
   * Procura um filme específico pelo seu ID.
   */
  async getMovieById(id: number): Promise<Movie | null> {
    await delay(randomLatency());
    const movie = moviesMock.find((m) => m.id === id);
    return movie || null;
  }

  /**
   * Retorna os créditos de um filme.
   */
  async getMovieCredits(id: number): Promise<MovieCredits | null> {
    await delay(randomLatency());
    const credits = creditsMock[id];
    return credits || null;
  }

  /**
   * Retorna os provedores onde o filme está disponível.
   */
  async getMovieWatchProviders(id: number): Promise<MovieWatchProviders | null> {
    await delay(randomLatency());
    const providers = providersMock[id];
    return providers || null;
  }

  /**
   * Procura filmes por um termo de pesquisa.
   */
  async searchMovies(query: string, page: number = 1): Promise<PaginatedResponse<Movie>> {
    await delay(randomLatency());

    const normalizedQuery = query.toLowerCase();
    const filteredMovies = moviesMock.filter(
      (movie) =>
        movie.title.toLowerCase().includes(normalizedQuery) ||
        (movie.originalTitle && movie.originalTitle.toLowerCase().includes(normalizedQuery)),
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
}

export const movieService = new MovieService();