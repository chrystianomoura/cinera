import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const file = { version: 1, ratings: { tt0816692: [8.7, 2300000], tt0000001: [7, null] } };

async function load() {
  vi.resetModules();
  return import("./imdb-ratings");
}

describe("notas do IMDb publicadas", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(file)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("devolve nota e votos no formato do OMDb", async () => {
    const { staticImdbRating } = await load();
    expect(await staticImdbRating("tt0816692")).toEqual({ rating: "8.7", votes: "2,300,000" });
    expect(await staticImdbRating("tt0000001")).toEqual({ rating: "7.0", votes: undefined });
  });

  it("filme fora do catálogo devolve null", async () => {
    const { staticImdbRating } = await load();
    expect(await staticImdbRating("tt9999999")).toBeNull();
  });

  it("baixa o arquivo uma vez só", async () => {
    const { staticImdbRating } = await load();
    await staticImdbRating("tt0816692");
    await staticImdbRating("tt0000001");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("arquivo inválido ou fora do ar vira null e a próxima tentativa busca de novo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const { staticImdbRating } = await load();
    expect(await staticImdbRating("tt0816692")).toBeNull();
    await staticImdbRating("tt0816692");
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ version: 2, ratings: {} })));
    const again = await load();
    expect(await again.staticImdbRating("tt0816692")).toBeNull();
  });
});
