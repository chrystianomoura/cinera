import { describe, expect, it } from "vitest";
import type { Movie } from "@/domain";
import { dedupeFranchises, filterQualifiedMovies, getFranchiseKey } from "./curation-filters";

const movie = (overrides: Partial<Movie>): Movie => ({
  id: 1,
  title: "Filme",
  overview: "Uma sinopse com mais de vinte caracteres.",
  posterPath: "/p.jpg",
  backdropPath: null,
  voteAverage: 7,
  voteCount: 100,
  releaseDate: "2020-01-01",
  ...overrides,
});

describe("getFranchiseKey", () => {
  it("reconhece sagas conhecidas em português e inglês", () => {
    expect(getFranchiseKey("Guerra nas Estrelas: O Império Contra-Ataca")).toBe(getFranchiseKey("Star Wars: A New Hope"));
    expect(getFranchiseKey("O Senhor dos Anéis: As Duas Torres")).toBe(getFranchiseKey("The Lord of the Rings: The Fellowship of the Ring"));
    expect(getFranchiseKey("Alien: O Oitavo Passageiro")).toBe(getFranchiseKey("Aliens: O Resgate"));
  });

  it("remove subtítulo, numeração e partes", () => {
    expect(getFranchiseKey("Toy Story 3")).toBe(getFranchiseKey("Toy Story 2"));
    expect(getFranchiseKey("Duna: Parte Dois")).toBe("dune");
  });

  it("filmes sem relação têm chaves diferentes", () => {
    expect(getFranchiseKey("Parasita")).not.toBe(getFranchiseKey("Whiplash"));
  });
});

describe("filterQualifiedMovies", () => {
  it("exige pôster, nota e votos mínimos", () => {
    const list = [
      movie({ id: 1 }),
      movie({ id: 2, posterPath: null }),
      movie({ id: 3, voteAverage: 5 }),
      movie({ id: 4, voteCount: 5 }),
    ];
    expect(filterQualifiedMovies(list, 6, 20).map((m) => m.id)).toEqual([1]);
  });

  it("exige sinopse real só quando pedido", () => {
    const list = [movie({ id: 1 }), movie({ id: 2, overview: "curta" })];
    expect(filterQualifiedMovies(list, 6, 20, false)).toHaveLength(2);
    expect(filterQualifiedMovies(list, 6, 20, true).map((m) => m.id)).toEqual([1]);
  });
});

describe("dedupeFranchises", () => {
  it("fica com o filme de maior nota de cada saga, na ordem da nota", () => {
    const result = dedupeFranchises([
      movie({ id: 1, title: "Toy Story", voteAverage: 8.0 }),
      movie({ id: 2, title: "Toy Story 3", voteAverage: 8.3 }),
      movie({ id: 3, title: "Parasita", voteAverage: 8.5 }),
    ]);
    expect(result.map((m) => m.id)).toEqual([3, 2]);
  });
});
