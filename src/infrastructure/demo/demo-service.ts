import type { Movie, MovieCredits, MovieWatchProviders, PaginatedResponse } from "@/domain";
import { getGenreProfile } from "@/features/catalog/constants";
import { dedupeFranchises, filterQualifiedMovies } from "../api/curation-filters";
import { demoCredits, demoMovies, demoProviders } from "./demo-data";

/**
 * Modo demonstração: respostas calculadas sobre alguns filmes de exemplo, usadas só quando o app roda sem chaves do
 * TMDB (por exemplo, ao clonar o repositório). Com as chaves configuradas, uma falha da API vira erro e nunca dados
 * de demonstração. Este módulo é carregado sob demanda (import dinâmico) e não entra no pacote principal.
 */

const PAGE_SIZE = 20;

const page1 = (results: Movie[]): PaginatedResponse<Movie> => ({ page: 1, results, totalPages: 1, totalResults: results.length });

export function trending(page: number): PaginatedResponse<Movie> {
  const start = (page - 1) * PAGE_SIZE;
  return {
    page,
    results: filterQualifiedMovies(demoMovies.slice(start, start + PAGE_SIZE), 5.5, 5),
    totalPages: Math.ceil(demoMovies.length / PAGE_SIZE),
    totalResults: demoMovies.length,
  };
}

export function hero(): Movie[] {
  return demoMovies.filter((m) => Boolean(m.tagline && m.tagline.trim().length > 0)).slice(0, 5);
}

export const movieById = (id: number): Movie | null => demoMovies.find((m) => m.id === id) ?? null;
export const credits = (id: number): MovieCredits | null => demoCredits[id] ?? null;
export const providers = (id: number): MovieWatchProviders | null => demoProviders[id] ?? null;

export function search(query: string, page: number): PaginatedResponse<Movie> {
  const q = query.toLowerCase();
  const found = demoMovies.filter((m) => m.title.toLowerCase().includes(q) || m.originalTitle?.toLowerCase().includes(q));
  const start = (page - 1) * PAGE_SIZE;
  return { page, results: found.slice(start, start + PAGE_SIZE), totalPages: Math.ceil(found.length / PAGE_SIZE), totalResults: found.length };
}

export function newReleases(): PaginatedResponse<Movie> {
  const currentYear = new Date().getFullYear();
  const recent = demoMovies.filter((m) => new Date(m.releaseDate).getFullYear() >= currentYear - 1);
  return page1(filterQualifiedMovies(recent.length > 0 ? recent : demoMovies, 5.5, 5));
}

const isAnimation = (m: Movie) => m.genres?.some((g) => g.id === 16 || g.name === "Animação");

function byEra(keep: (year: number) => boolean): PaginatedResponse<Movie> {
  const films = demoMovies.filter((m) => keep(new Date(m.releaseDate).getFullYear()) && !isAnimation(m)).sort((a, b) => b.voteAverage - a.voteAverage);
  return page1(dedupeFranchises(filterQualifiedMovies(films.length > 0 ? films : demoMovies, 6.0, 10)));
}

export const topRated = () => byEra((year) => year >= 2000);
export const classics = () => byEra((year) => year <= 1999);

export function popular(): PaginatedResponse<Movie> {
  return page1(filterQualifiedMovies([...demoMovies].sort((a, b) => b.voteCount - a.voteCount), 6.0, 10));
}

export function byGenre(categoryOrQuery: string | number, page: number): PaginatedResponse<Movie> & { nextPage?: number } {
  const key = String(categoryOrQuery).trim();
  const ids = new Set((getGenreProfile(key)?.withGenres ?? key).split("|").map(Number));
  const inGenre = demoMovies.filter((m) => m.genres?.some((g) => ids.has(g.id)));
  const results = filterQualifiedMovies(inGenre.length > 0 ? inGenre : demoMovies, 6.0, 20);
  return { page, results, totalPages: 1, totalResults: results.length, nextPage: undefined };
}
