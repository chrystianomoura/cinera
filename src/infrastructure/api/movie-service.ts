import type { Movie, MovieCredits, MovieWatchProviders, PaginatedResponse } from '@/domain';
import { moviesMock, creditsMock, providersMock } from '../mock/movies.mock';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN;
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

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
 * Mapeamento oficial dos IDs de gêneros do TMDB para pt-BR.
 */
export const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção científica",
  10770: "Cinema TV",
  53: "Thriller",
  10752: "Guerra",
  37: "Faroeste",
};

export interface MovieVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

/**
 * Interface para os dados brutos de filme retornados pela API do TMDB.
 */
interface TMDBMovieRaw {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  runtime?: number;
  tagline?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  status?: string;
}

interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * Converte o formato retornado pelo TMDB (snake_case) para o domínio da aplicação (camelCase).
 */
const mapTMDBMovie = (raw: TMDBMovieRaw): Movie => {
  const genres = raw.genres || (raw.genre_ids ? raw.genre_ids.map(id => ({ id, name: TMDB_GENRE_MAP[id] })).filter(g => Boolean(g.name)) : undefined);
  return {
    id: raw.id,
    title: raw.title,
    originalTitle: raw.original_title,
    overview: raw.overview || '',
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    voteAverage: Number((raw.vote_average || 0).toFixed(1)),
    voteCount: raw.vote_count || 0,
    releaseDate: raw.release_date || '',
    runtime: raw.runtime,
    tagline: raw.tagline,
    genres,
    status: raw.status,
  };
};

/**
 * Executa requisições autenticadas para a API do TMDB.
 */
async function fetchFromTMDB<T>(pathWithQuery: string): Promise<T> {
  const separator = pathWithQuery.includes('?') ? '&' : '?';
  let fullUrl = `${TMDB_BASE_URL}${pathWithQuery}`;

  const headers: HeadersInit = {
    accept: 'application/json',
  };

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  } else if (API_KEY) {
    fullUrl += `${separator}api_key=${API_KEY}`;
  }

  const response = await fetch(fullUrl, { headers });
  if (!response.ok) {
    throw new Error(`Erro na chamada da API TMDB (${response.status}): ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Classe responsável pelas chamadas da API do TMDB para o domínio de filmes.
 */
class MovieService {
  /**
   * Retorna os filmes em tendência do dia.
   */
  async getTrendingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
        const data = await fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
          `/trending/movie/day?language=pt-BR&page=${page}`
        );

        return {
          page: data.page,
          results: data.results.map(mapTMDBMovie),
          totalPages: data.total_pages,
          totalResults: data.total_results,
        };
      }
    } catch (error) {
      console.warn('Falha ao obter filmes em tendência da API do TMDB, usando fallback mock:', error);
    }

    // Fallback para mock se a API falhar ou não houver credenciais
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
   * Retorna filmes em destaque para o Hero com critérios rígidos:
   * Possuir backdrop de alta resolução, nota IMDb mínima (>= 6.5),
   * contagem de votos real (>= 10) e OBRIGATORIAMENTE possuir tagline oficial.
   */
  async getHeroFeaturedMovies(): Promise<Movie[]> {
    try {
      if (API_TOKEN || API_KEY) {
        const trending = await this.getTrendingMovies(1);
        const candidates = trending.results.filter(
          (m) => Boolean(m.backdropPath && m.voteAverage >= 6.5 && m.voteCount >= 10)
        );

        // Busca detalhes completos em paralelo para obter a tagline oficial e metadados
        const detailedMovies = await Promise.all(
          candidates.slice(0, 10).map((m) => this.getMovieById(m.id))
        );

        // REGRA ESTRITA: Se não tiver tagline oficial, não entra no Hero
        const heroValid = detailedMovies.filter(
          (m): m is Movie => Boolean(m && m.tagline && m.tagline.trim().length > 0)
        );

        if (heroValid.length > 0) {
          return heroValid;
        }
      }
    } catch (error) {
      console.warn('Falha ao obter filmes em destaque para o Hero:', error);
    }

    // Fallback para mock: apenas filmes que possuem tagline oficial
    return moviesMock.filter((m) => Boolean(m.tagline && m.tagline.trim().length > 0));
  }

  /**
   * Procura um filme específico pelo seu ID.
   */
  async getMovieById(id: number): Promise<Movie | null> {
    try {
      if (API_TOKEN || API_KEY) {
        const raw = await fetchFromTMDB<TMDBMovieRaw>(`/movie/${id}?language=pt-BR`);
        return mapTMDBMovie(raw);
      }
    } catch (error) {
      console.warn(`Falha ao obter filme ${id} do TMDB:`, error);
    }

    const movie = moviesMock.find((m) => m.id === id);
    return movie || null;
  }

  /**
   * Retorna os créditos de um filme.
   */
  async getMovieCredits(id: number): Promise<MovieCredits | null> {
    try {
      if (API_TOKEN || API_KEY) {
        interface TMDBCreditsRaw {
          id: number;
          cast: Array<{
            id: number;
            name: string;
            character: string;
            profile_path: string | null;
            order: number;
          }>;
          crew: Array<{
            id: number;
            name: string;
            job: string;
            department: string;
            profile_path: string | null;
          }>;
        }

        const data = await fetchFromTMDB<TMDBCreditsRaw>(`/movie/${id}/credits?language=pt-BR`);
        return {
          id: data.id,
          cast: (data.cast || []).map((c) => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profilePath: c.profile_path,
            order: c.order,
          })),
          crew: (data.crew || []).map((c) => ({
            id: c.id,
            name: c.name,
            job: c.job,
            department: c.department,
            profilePath: c.profile_path,
          })),
        };
      }
    } catch (error) {
      console.warn(`Falha ao obter créditos do filme ${id} do TMDB:`, error);
    }

    const credits = creditsMock[id];
    return credits || null;
  }

  /**
   * Retorna os provedores onde o filme está disponível.
   */
  async getMovieWatchProviders(id: number): Promise<MovieWatchProviders | null> {
    try {
      if (API_TOKEN || API_KEY) {
        interface TMDBProviderRaw {
          provider_id: number;
          provider_name: string;
          logo_path: string;
          display_priority: number;
        }
        interface TMDBProvidersResponse {
          id: number;
          results: {
            BR?: {
              flatrate?: TMDBProviderRaw[];
              rent?: TMDBProviderRaw[];
              buy?: TMDBProviderRaw[];
            };
            US?: {
              flatrate?: TMDBProviderRaw[];
              rent?: TMDBProviderRaw[];
              buy?: TMDBProviderRaw[];
            };
          };
        }

        const data = await fetchFromTMDB<TMDBProvidersResponse>(`/movie/${id}/watch/providers`);
        const region = data.results?.BR || data.results?.US;

        if (!region) return null;

        const mapProviderList = (list?: TMDBProviderRaw[]) =>
          (list || []).map((p) => ({
            providerId: p.provider_id,
            providerName: p.provider_name,
            logoPath: p.logo_path,
            displayPriority: p.display_priority,
          }));

        return {
          flatrate: mapProviderList(region.flatrate),
          rent: mapProviderList(region.rent),
          buy: mapProviderList(region.buy),
        };
      }
    } catch (error) {
      console.warn(`Falha ao obter provedores de streaming do filme ${id} do TMDB:`, error);
    }

    const providers = providersMock[id];
    return providers || null;
  }

  /**
   * Procura filmes por um termo de pesquisa no TMDB.
   */
  async searchMovies(query: string, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if ((API_TOKEN || API_KEY) && query.trim()) {
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
      console.warn(`Falha ao pesquisar filmes no TMDB para o termo "${query}":`, error);
    }

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
  /**
   * Retorna os vídeos e trailers de um filme.
   */
  async getMovieVideos(id: number): Promise<MovieVideo[]> {
    try {
      if (API_TOKEN || API_KEY) {
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
}

export const movieService = new MovieService();