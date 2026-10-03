/**
 * Representa um gênero de filme.
 */
export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logoPath?: string | null;
  originCountry?: string;
}

/**
 * Representa os detalhes e atributos de um filme.
 */
export interface Movie {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  popularity?: number;
  releaseDate: string;
  runtime?: number;
  tagline?: string;
  genres?: Genre[];
  status?: string;
  budget?: number;
  revenue?: number;
  productionCompanies?: ProductionCompany[];
  imdbId?: string | null;
  /** Categorias do Cinera já calculadas pelo catálogo (até 2); a ficha usa estas quando existem */
  categories?: string[];
}

/**
 * Interface genérica para respostas paginadas de listas (como lista de filmes).
 */
export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  totalPages: number;
  totalResults: number;
  nextPage?: number;
}