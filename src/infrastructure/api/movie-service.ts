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
 * Filtra filmes estritamente qualificados para a vitrine:
 * - Deve ter nota válida maior ou igual ao piso (padrão: 6.0)
 * - Deve ter contagem de votos relevante (padrão: 20)
 * - Deve ter cartaz de exibição oficial (posterPath)
 */
export const filterQualifiedMovies = (
  movies: Movie[],
  minVoteAverage: number = 6.0,
  minVoteCount: number = 20
): Movie[] => {
  return movies.filter(
    (m) =>
      Boolean(
        m.posterPath &&
        m.voteAverage >= minVoteAverage &&
        m.voteCount >= minVoteCount
      )
  );
};

/**
 * Normaliza o título ou saga para identificar filmes pertencentes à mesma franquia.
 */
export function getFranchiseKey(title: string, originalTitle?: string): string {
  const normalize = (t: string) => {
    let s = t.toLowerCase().trim();
    if (s.includes("harry potter")) return "harry potter";
    if (s.includes("senhor dos anéis") || s.includes("lord of the rings")) return "lord of the rings";
    if (s.includes("poderoso chefão") || s.includes("godfather")) return "the godfather";
    if (s.includes("vingadores") || s.includes("avengers")) return "avengers";
    if (s.includes("star wars") || s.includes("guerra nas estrelas")) return "star wars";
    if (s.includes("homem-aranha") || s.includes("spider-man")) return "spider-man";
    if (s.includes("batman") || s.includes("cavaleiro das trevas") || s.includes("dark knight")) return "batman";
    if (s.includes("de volta para o futuro") || s.includes("back to the future")) return "back to the future";
    if (s.includes("toy story")) return "toy story";
    if (s.includes("kill bill")) return "kill bill";
    if (s.includes("matrix")) return "matrix";
    if (s.includes("alien")) return "alien";
    if (s.includes("gladiador") || s.includes("gladiator")) return "gladiator";
    if (s.includes("exterminador do futuro") || s.includes("terminator")) return "terminator";
    if (s.includes("indiana jones")) return "indiana jones";
    if (s.includes("shrek")) return "shrek";
    if (s.includes("mad max")) return "mad max";
    if (s.includes("jurassic")) return "jurassic";
    if (s.includes("duna") || s.includes("dune")) return "dune";
    if (s.includes("blade runner")) return "blade runner";
    if (s.includes("top gun")) return "top gun";
    if (s.includes("avatar")) return "avatar";
    if (s.includes("planeta dos macacos") || s.includes("planet of the apes")) return "planet of the apes";
    if (s.includes("missão: impossível") || s.includes("missao impossivel") || s.includes("mission: impossible")) return "mission impossible";

    if (s.includes(":")) {
      s = s.split(":")[0].trim();
    }
    if (s.includes(" - ")) {
      s = s.split(" - ")[0].trim();
    }
    s = s.replace(/\s+(parte\s+[ivx\d]+|vol\.\s*\d+|\d+|[ivx]+)$/i, "").trim();
    return s;
  };

  const key1 = normalize(title);
  if (originalTitle) {
    const key2 = normalize(originalTitle);
    if (key2.length < key1.length && key2.length > 3) return key2;
  }
  return key1;
}

/**
 * Deduplica títulos pertencentes à mesma franquia, mantendo estritamente
 * o filme com a maior nota (já que a lista original vem ordenada decrescente por nota).
 */
export function dedupeFranchises(movies: Movie[]): Movie[] {
  const seenFranchises = new Set<string>();
  const result: Movie[] = [];
  for (const m of movies) {
    const key = getFranchiseKey(m.title, m.originalTitle);
    if (!seenFranchises.has(key)) {
      seenFranchises.add(key);
      result.push(m);
    }
  }
  return result;
}

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
   * Retorna os filmes em tendência do dia com filtro estrito de qualidade.
   */
  async getTrendingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
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
      console.warn('Falha ao obter filmes em tendência da API do TMDB, usando fallback mock:', error);
    }

    // Fallback para mock se a API falhar ou não houver credenciais
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
   * Possuir backdrop de alta resolução, nota IMDb mínima (>= 6.5),
   * contagem de votos real (>= 10) e OBRIGATORIAMENTE possuir tagline oficial.
   */
  async getHeroFeaturedMovies(): Promise<Movie[]> {
    try {
      if (API_TOKEN || API_KEY) {
        const trending = await this.getTrendingMovies(1);
        
        // Padrão Ouro: Nota mínima elevada para >= 7.0, votos >= 10 e backdrop horizontal
        let candidates = trending.results.filter(
          (m) => Boolean(m.backdropPath && m.voteAverage >= 7.0 && m.voteCount >= 10)
        );

        // Fallback de Segurança: Se menos de 3 filmes atingirem 7.0, relaxa suavemente para >= 6.5 para nunca faltar filme
        if (candidates.length < 3) {
          candidates = trending.results.filter(
            (m) => Boolean(m.backdropPath && m.voteAverage >= 6.5 && m.voteCount >= 10)
          );
        }

        // Busca detalhes completos em paralelo para obter a tagline oficial e metadados
        const detailedMovies = await Promise.all(
          candidates.slice(0, 10).map((m) => this.getMovieById(m.id))
        );

        // REGRA ESTRITA: Prioriza filmes com tagline oficial
        const heroValid = detailedMovies.filter(
          (m): m is Movie => Boolean(m && m.tagline && m.tagline.trim().length > 0)
        );

        if (heroValid.length >= 3) {
          return heroValid;
        }

        // Fallback de segurança: Se menos de 3 tiverem tagline, inclui os candidatos qualificados
        const validCandidates = detailedMovies.filter((m): m is Movie => Boolean(m));
        if (validCandidates.length > 0) {
          return validCandidates;
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
   * Retorna lançamentos autênticos e novidades do ano corrente com alta relevância.
   * Substitui chamadas genéricas de cinema por produções originais recentes.
   */
  async getNewReleasesMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
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
   * Mantém retrocompatibilidade para o nome anterior, redirecionando para as Novidades.
   */
  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.getNewReleasesMovies(page);
  }

  /**
   * Retorna os filmes aclamados pela crítica contemporânea (Século XXI: 2000 em diante).
   * Filtro estrito: exclui animações (sem desenhos) para focar puramente em cinema live-action de alta qualidade.
   */
  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
        // Busca 3 páginas (60 filmes) para que, após a remoção de franquias repetidas e animações,
        // ainda tenhamos com folga 20 filmes de altíssimo prestígio
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
   * Retorna os clássicos indispensáveis da história do cinema (obras consagradas até 1999).
   * Filtro estrito: exclui animações e deduplica franquias (apenas o filme mais bem avaliado de cada saga entra).
   */
  async getClassicMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
        // Busca 3 páginas (60 filmes) para abastecer a deduplicação de franquias pré-2000
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
   * Filtro estrito: nota mínima 6.0 e pelo menos 50 votos para eliminar filmes medíocres como 3.9.
   */
  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
        // Busca 5 páginas (100 filmes) para que, após a deduplicação com Em Alta e Novidades,
        // ainda sobrem com folga mais de 20 filmes consagrados e populares.
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
   * Retorna filmes filtrados por macrogênero de streaming (suporta união com '|', ex: '28|12').
   * Aplica critérios rigorosos de qualidade:
   * - Cartaz oficial obrigatório (posterPath != null)
   * - Avaliação mínima de 6.5 (voteAverage >= 6.5)
   * - Contagem mínima de 30 votos (voteCount >= 30)
   * - Ordenação decrescente por popularidade
   * - Sem animações em categorias live-action (without_genres=16)
   * Busca paralela concorrente via Promise.all para carregamento instantâneo.
   */
  async getMoviesByGenre(genreQuery: string | number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      if (API_TOKEN || API_KEY) {
        const queryStr = String(genreQuery);
        // Exclui animações de categorias live-action (salvo quando o usuário está na própria categoria Animação '16')
        const withoutParam = queryStr.includes("16") ? "" : "&without_genres=16";
        let currentTmdbPage = page;
        const collectedMovies: Movie[] = [];
        let totalPages = Infinity;
        let totalResults = 0;
        const targetBatchCount = 18;
        let chunksFetched = 0;
        const maxChunks = 2; // Até 4 páginas em paralelo

        while (
          collectedMovies.length < targetBatchCount &&
          currentTmdbPage <= totalPages &&
          chunksFetched < maxChunks
        ) {
          const pagesToFetch = [currentTmdbPage];
          if (currentTmdbPage + 1 <= totalPages) {
            pagesToFetch.push(currentTmdbPage + 1);
          }

          const pageResponses = await Promise.all(
            pagesToFetch.map((p) =>
              fetchFromTMDB<TMDBPaginatedResponse<TMDBMovieRaw>>(
                `/discover/movie?language=pt-BR&with_genres=${queryStr}${withoutParam}&sort_by=popularity.desc&vote_count.gte=30&vote_average.gte=6.5&page=${p}`
              )
            )
          );

          for (const data of pageResponses) {
            totalPages = Math.min(totalPages, data.total_pages);
            totalResults = Math.max(totalResults, data.total_results);

            const qualified = filterQualifiedMovies(
              data.results.map(mapTMDBMovie),
              6.5,
              30
            );

            collectedMovies.push(...qualified);
          }

          currentTmdbPage += pagesToFetch.length;
          chunksFetched++;
        }

        // Deduplicação de segurança por ID
        const seenIds = new Set<number>();
        const uniqueMovies: Movie[] = [];
        for (const m of collectedMovies) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            uniqueMovies.push(m);
          }
        }

        const hasNext = currentTmdbPage <= totalPages && (uniqueMovies.length > 0 || currentTmdbPage < totalPages);

        return {
          page,
          results: uniqueMovies,
          totalPages,
          totalResults,
          nextPage: hasNext ? currentTmdbPage : undefined,
        };
      }
    } catch (error) {
      console.warn(`Falha ao obter filmes do gênero ${genreQuery} do TMDB:`, error);
    }

    // Fallback Mock
    const queryIds = new Set(String(genreQuery).split('|').map(Number));
    const filtered = moviesMock.filter((m) =>
      m.genres?.some((g) => queryIds.has(g.id))
    );
    const results = filterQualifiedMovies(filtered.length > 0 ? filtered : moviesMock, 6.5, 20);
    return {
      page,
      results,
      totalPages: 1,
      totalResults: results.length,
      nextPage: undefined,
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