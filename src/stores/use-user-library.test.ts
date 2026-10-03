// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { Movie } from "@/domain";
import { toLibraryMovie, useUserLibrary } from "./use-user-library";

const movie = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  overview: "Sinopse",
  posterPath: "/p.jpg",
  backdropPath: null,
  voteAverage: 7,
  voteCount: 100,
  releaseDate: "2020-01-01",
  categories: ["Drama"],
});

const state = () => useUserLibrary.getState();

describe("biblioteca do usuário", () => {
  beforeEach(() => {
    localStorage.clear();
    useUserLibrary.setState({ watchlist: [], watched: [], movies: {} });
  });

  it("adiciona à lista de querer assistir, com o mais novo no topo, e guarda o resumo", () => {
    state().toggleWatchlist(1, movie(1));
    state().toggleWatchlist(2, movie(2));
    expect(state().watchlist).toEqual([2, 1]);
    expect(state().movies[1]).toMatchObject({ id: 1, title: "Filme 1", categories: ["Drama"] });
  });

  it("clicar de novo remove da lista e descarta o resumo", () => {
    state().toggleWatchlist(1, movie(1));
    state().toggleWatchlist(1);
    expect(state().watchlist).toEqual([]);
    expect(state().movies[1]).toBeUndefined();
  });

  it("marcar como assistido tira o filme de querer assistir, e vice-versa", () => {
    state().toggleWatchlist(1, movie(1));
    state().toggleWatched(1, movie(1));
    expect(state().watchlist).toEqual([]);
    expect(state().watched).toEqual([1]);
    state().toggleWatchlist(1, movie(1));
    expect(state().watched).toEqual([]);
    expect(state().watchlist).toEqual([1]);
  });

  it("o resumo continua guardado enquanto o filme está em alguma lista", () => {
    state().moveToWatched(5);
    state().toggleWatchlist(5, movie(5));
    state().toggleWatched(5, movie(5));
    state().toggleWatched(5);
    expect(state().movies[5]).toBeUndefined();
  });

  it("move entre as listas sem duplicar", () => {
    state().toggleWatchlist(1, movie(1));
    state().moveToWatched(1);
    state().moveToWatched(1);
    expect(state().watched).toEqual([1]);
    expect(state().watchlist).toEqual([]);
    state().moveToWatchlist(1);
    expect(state().watchlist).toEqual([1]);
    expect(state().watched).toEqual([]);
  });

  it("ignora IDs inválidos", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      state().toggleWatchlist(bad);
      state().toggleWatched(bad);
      state().moveToWatched(bad);
      state().moveToWatchlist(bad);
    }
    expect(state().watchlist).toEqual([]);
    expect(state().watched).toEqual([]);
  });

  it("rememberMovies completa só o resumo de filmes salvos que ainda faltam", () => {
    useUserLibrary.setState({ watchlist: [1], watched: [], movies: {} });
    state().rememberMovies([movie(1), movie(2)]);
    expect(Object.keys(state().movies)).toEqual(["1"]);
  });

  it("persiste no localStorage só dados, sem funções", () => {
    state().toggleWatchlist(1, movie(1));
    const saved = JSON.parse(localStorage.getItem("cinera_user_library") ?? "{}") as { state: Record<string, unknown> };
    expect(Object.keys(saved.state).sort()).toEqual(["movies", "watched", "watchlist"]);
  });

  it("toLibraryMovie guarda só o necessário para o card e a ficha", () => {
    const summary = toLibraryMovie({ ...movie(1), budget: 1000, runtime: 100 });
    expect(summary).not.toHaveProperty("budget");
    expect(summary).not.toHaveProperty("runtime");
    expect(summary.categories).toEqual(["Drama"]);
  });
});
