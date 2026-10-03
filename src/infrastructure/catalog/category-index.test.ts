import { describe, expect, it } from "vitest";
import { resolveCategories } from "./category-index";

describe("resolveCategories", () => {
  const movie = { id: 10, genres: [{ name: "Drama" }, { name: "Romance" }] };

  it("prefere as categorias que o próprio filme já traz do catálogo", () => {
    expect(resolveCategories({ ...movie, categories: ["Comédia"] }, { "10": ["Terror"] })).toEqual(["Comédia"]);
  });

  it("usa o índice quando o filme não traz categorias", () => {
    expect(resolveCategories(movie, { "10": ["Terror", "Drama"] })).toEqual(["Terror", "Drama"]);
  });

  it("sem índice nem categorias, classifica pelas tags do TMDB", () => {
    expect(resolveCategories(movie, null)).toEqual(["Drama", "Romance"]);
    expect(resolveCategories({ id: 11 }, undefined)).toEqual([]);
  });

  it("filme fora do índice cai na classificação pelas tags", () => {
    expect(resolveCategories(movie, { "99": ["Terror"] })).toEqual(["Drama", "Romance"]);
  });
});
