import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CINERA_CATEGORIES } from "../../domain/classification";
import { GENRE_SLUGS } from "../../features/catalog/constants";
import { catalogSchema, CATALOG_ROW_IDS } from "./catalog-schema";
import { categoryIndexSchema } from "./category-index";
import { genreCatalogSchema } from "./genre-catalog";

const publicDir = path.resolve(__dirname, "../../../public");
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(publicDir, file), "utf8")) as unknown;

describe("contrato dos arquivos publicados", () => {
  it("catalog.json tem as 5 fileiras e um destaque com imagem e tagline", () => {
    const catalog = catalogSchema.parse(read("catalog.json"));
    expect(catalog.rows.map((r) => r.id).sort()).toEqual([...CATALOG_ROW_IDS].sort());
    expect(catalog.hero).toHaveLength(CATALOG_ROW_IDS.length);
    for (const movie of catalog.hero ?? []) {
      expect(movie.backdropPath).toBeTruthy();
      expect(movie.tagline?.trim()).toBeTruthy();
    }
  });

  it("categories.json é válido e só usa as categorias do Cinera", () => {
    const index = categoryIndexSchema.parse(read("categories.json")).categories;
    expect(Object.keys(index).length).toBeGreaterThan(1000);
    for (const categories of Object.values(index)) {
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.length).toBeLessThanOrEqual(2);
      for (const category of categories) expect(CINERA_CATEGORIES).toContain(category);
    }
  });

  for (const category of CINERA_CATEGORIES) {
    it(`a lista de ${category} é válida e todo filme tem a própria categoria`, () => {
      const list = genreCatalogSchema.parse(read(`genres/${GENRE_SLUGS[category]}.json`));
      expect(list.genre).toBe(category);
      expect(list.movies.length).toBeGreaterThan(30);
      expect(new Set(list.movies.map((m) => m.id)).size).toBe(list.movies.length);
      for (const movie of list.movies) {
        expect(movie.posterPath).toBeTruthy();
        expect(movie.categories).toContain(category);
      }
    });
  }
});
