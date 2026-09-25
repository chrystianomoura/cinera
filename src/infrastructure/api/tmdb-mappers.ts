import type { Movie, MovieCredits, MovieWatchProviders } from '@/domain';
import {
  TMDB_GENRE_MAP,
  type TMDBMovieRaw,
  type TMDBCreditsRaw,
  type TMDBProvidersResponse,
  type TMDBProviderRaw,
} from './tmdb-types';


/**
 * Converte os dados brutos de filme retornados pelo TMDB (snake_case) para o modelo de domínio da aplicação.
 */
export function mapTMDBMovie(raw: TMDBMovieRaw): Movie {
  const genres =
    raw.genres ||
    (raw.genre_ids
      ? raw.genre_ids
          .map((id) => ({ id, name: TMDB_GENRE_MAP[id] }))
          .filter((g) => Boolean(g.name))
      : undefined);

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
    budget: raw.budget,
    revenue: raw.revenue,
    productionCompanies: raw.production_companies?.map((c) => ({
      id: c.id,
      name: c.name,
      logoPath: c.logo_path,
      originCountry: c.origin_country,
    })),
  };
}

/**
 * Converte os créditos de filme do TMDB para o modelo de domínio da aplicação.
 */
export function mapTMDBCredits(data: TMDBCreditsRaw): MovieCredits {
  const crew = data.crew || [];
  const directors = Array.from(
    new Set(crew.filter((c) => c.job === "Director").map((c) => c.name))
  );
  const writers = Array.from(
    new Set(
      crew
        .filter(
          (c) =>
            c.job === "Screenplay" ||
            c.job === "Writer" ||
            c.department === "Writing"
        )
        .map((c) => c.name)
    )
  );

  return {
    id: data.id,
    cast: (data.cast || []).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    })),
    crew: crew.map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profilePath: c.profile_path,
    })),
    directors: directors.length > 0 ? directors : undefined,
    writers: writers.length > 0 ? writers : undefined,
  };
}

/**
 * Converte os provedores de streaming do TMDB para o modelo de domínio da aplicação.
 */
export function mapTMDBWatchProviders(
  data: TMDBProvidersResponse
): MovieWatchProviders | null {
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
