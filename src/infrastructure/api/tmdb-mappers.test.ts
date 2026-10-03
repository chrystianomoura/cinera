import { describe, expect, it } from "vitest";
import { mapTMDBMovie } from "./tmdb-mappers";
import type { TMDBMovieRaw } from "./tmdb-types";

const raw = (overrides: Partial<TMDBMovieRaw> = {}): TMDBMovieRaw =>
  ({
    id: 1,
    title: "Filme",
    original_title: "Movie",
    overview: "Sinopse",
    poster_path: "/p.jpg",
    backdrop_path: "/b.jpg",
    vote_average: 7.456,
    vote_count: 10,
    popularity: 5,
    release_date: "2020-05-01",
    ...overrides,
  }) as TMDBMovieRaw;

describe("mapTMDBMovie", () => {
  it("converte os campos para o modelo do app e arredonda a nota", () => {
    const movie = mapTMDBMovie(raw());
    expect(movie).toMatchObject({ id: 1, title: "Filme", originalTitle: "Movie", posterPath: "/p.jpg", voteAverage: 7.5, voteCount: 10 });
  });

  it("transforma genre_ids em gêneros com nome e descarta os desconhecidos", () => {
    const movie = mapTMDBMovie(raw({ genre_ids: [18, 99999] }));
    expect(movie.genres).toEqual([{ id: 18, name: "Drama" }]);
  });

  it("aceita campos ausentes sem quebrar", () => {
    const movie = mapTMDBMovie(raw({ overview: undefined as unknown as string, vote_average: undefined as unknown as number, release_date: undefined as unknown as string, imdb_id: undefined }));
    expect(movie.overview).toBe("");
    expect(movie.voteAverage).toBe(0);
    expect(movie.releaseDate).toBe("");
    expect(movie.imdbId).toBeNull();
  });
});
