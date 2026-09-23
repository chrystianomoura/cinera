/**
 * Representa um gênero de filme.
 */
export interface Genre {
  id: number;
  name: string;
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
  releaseDate: string;
  runtime?: number;
  tagline?: string;
  genres?: Genre[];
  status?: string;
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
