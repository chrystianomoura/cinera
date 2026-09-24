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
export interface TMDBMovieRaw {
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

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBCreditsRaw {
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

export interface TMDBProviderRaw {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TMDBProvidersResponse {
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
