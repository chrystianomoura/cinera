import { describe, expect, it } from "vitest";
import { createDeduper, HOME_ROW_LIMIT, HOME_ROW_ORDER } from "./home-assembly";
import { CATALOG_ROW_IDS } from "./catalog-schema";

const films = (ids: number[]) => ids.map((id) => ({ id }));

describe("createDeduper", () => {
  it("nenhum filme se repete entre fileiras", () => {
    const dedupe = createDeduper<{ id: number }>();
    const first = dedupe(films([1, 2, 3]));
    const second = dedupe(films([3, 4, 5]));
    expect(first.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(second.map((m) => m.id)).toEqual([4, 5]);
  });

  it("não repete os filmes do destaque", () => {
    const dedupe = createDeduper<{ id: number }>([2]);
    expect(dedupe(films([1, 2, 3])).map((m) => m.id)).toEqual([1, 3]);
  });

  it("respeita o limite de cada fileira", () => {
    const dedupe = createDeduper<{ id: number }>();
    const row = dedupe(films(Array.from({ length: 50 }, (_, i) => i + 1)));
    expect(row).toHaveLength(HOME_ROW_LIMIT);
  });

  it("aceita lista ausente", () => {
    expect(createDeduper<{ id: number }>()(undefined)).toEqual([]);
  });

  it("filme cortado pelo limite continua disponível para a fileira seguinte", () => {
    const dedupe = createDeduper<{ id: number }>([], 2);
    expect(dedupe(films([1, 2, 3])).map((m) => m.id)).toEqual([1, 2]);
    expect(dedupe(films([3, 4])).map((m) => m.id)).toEqual([3, 4]);
  });
});

describe("ordem da Home", () => {
  it("cobre exatamente as fileiras do catálogo, sem repetir", () => {
    expect([...HOME_ROW_ORDER].sort()).toEqual([...CATALOG_ROW_IDS].sort());
  });

  it("Novidades vem antes de Em Alta", () => {
    expect(HOME_ROW_ORDER.indexOf("novidades")).toBeLessThan(HOME_ROW_ORDER.indexOf("em-alta"));
  });
});
