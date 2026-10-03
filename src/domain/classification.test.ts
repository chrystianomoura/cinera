import { describe, expect, it } from "vitest";
import { CINERA_CATEGORIES, classifyMovie, formatCategories } from "./classification";
import { runFixtures } from "../../scripts/curation/classification-fixtures";

describe("classificação: filmes de referência", () => {
  for (const result of runFixtures().filter((r) => !r.known)) {
    it(`${result.title} → ${result.categories.join(" / ")}`, () => {
      expect(result.problem).toBe("");
    });
  }

  it("registra Operação França como limitação conhecida (as duas fontes o marcam como Ação)", () => {
    const known = runFixtures().find((r) => r.known);
    expect(known?.title).toBe("Operação França");
    expect(known?.ok).toBe(false);
  });
});

describe("classificação: regras", () => {
  it("só devolve nomes das 9 categorias do Cinera", () => {
    const tags = ["Ação", "Aventura", "Comédia", "Drama", "Terror", "Thriller", "Romance", "História", "Guerra", "Faroeste", "Música", "Mistério"];
    for (const tag of tags) {
      for (const category of classifyMovie({ tmdbGenres: [tag, "Drama"] })) {
        expect(CINERA_CATEGORIES).toContain(category);
      }
    }
  });

  it("nunca devolve mais de 2 categorias", () => {
    expect(classifyMovie({ tmdbGenres: ["Ação", "Aventura", "Terror", "Romance", "Comédia", "Ficção científica"] }).length).toBeLessThanOrEqual(2);
  });

  it("Animação e Documentário vivem sozinhos, e Documentário vence Animação", () => {
    expect(classifyMovie({ tmdbGenres: ["Animação", "Drama", "Guerra"] })).toEqual(["Animação"]);
    expect(classifyMovie({ tmdbGenres: ["Documentário", "Crime"] })).toEqual(["Documentário"]);
    expect(classifyMovie({ tmdbGenres: ["Animação", "Documentário"] })).toEqual(["Documentário"]);
  });

  it("o formato também vale quando só o IMDb o informa", () => {
    expect(classifyMovie({ tmdbGenres: ["Drama", "Música"], imdbGenres: ["Documentary", "Music"] })).toEqual(["Documentário"]);
  });

  it("filme cujo único gênero é Música é um show filmado: Documentário", () => {
    expect(classifyMovie({ tmdbGenres: ["Música"] })).toEqual(["Documentário"]);
    expect(classifyMovie({ tmdbGenres: ["Música", "Drama"] })).not.toEqual(["Documentário"]);
  });

  it("história real afasta Ação do primeiro plano", () => {
    expect(classifyMovie({ tmdbGenres: ["Ação", "Drama", "Thriller"], imdbGenres: ["Action", "Biography", "Crime"] })).not.toContain("Ação & Aventura");
  });

  it("Drama junto com Comédia mantém as duas, com Drama à frente quando o TMDB o lista primeiro", () => {
    expect(classifyMovie({ tmdbGenres: ["Drama", "Comédia"], imdbGenres: ["Comedy", "Drama"] })).toEqual(["Drama", "Comédia"]);
  });

  it("filme de um gênero só tem uma categoria", () => {
    expect(classifyMovie({ tmdbGenres: ["Drama"] })).toEqual(["Drama"]);
  });

  it("gêneros que caem na mesma categoria não a repetem", () => {
    expect(classifyMovie({ tmdbGenres: ["Drama", "História", "Guerra"] })).toEqual(["Drama"]);
  });

  it("sem gêneros, sem categorias", () => {
    expect(classifyMovie({ tmdbGenres: [] })).toEqual([]);
  });

  it("lista do IMDb com 3 gêneros pode estar cortada e não desmente o TMDB", () => {
    const result = classifyMovie({ tmdbGenres: ["Ação", "Ficção científica"], imdbGenres: ["Action", "Adventure", "Horror"] });
    expect(result).toContain("Ficção & Fantasia");
  });

  it("é determinística: a mesma entrada dá sempre o mesmo resultado", () => {
    const input = { tmdbGenres: ["Comédia", "Drama", "Romance"], imdbGenres: ["Drama", "Romance"] };
    expect(classifyMovie(input)).toEqual(classifyMovie(input));
  });
});

describe("formatCategories", () => {
  it("junta com barra", () => {
    expect(formatCategories(["Drama", "Suspense & Crime"])).toBe("Drama / Suspense & Crime");
  });

  it("devolve null quando não há categorias", () => {
    expect(formatCategories([])).toBeNull();
    expect(formatCategories(undefined)).toBeNull();
    expect(formatCategories(null)).toBeNull();
  });
});
