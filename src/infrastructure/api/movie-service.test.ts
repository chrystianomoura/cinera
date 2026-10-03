import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O tmdb-client lê as chaves ao ser carregado: cada teste carrega o serviço de novo, com ou sem chave.
async function loadService(withKey: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_TMDB_API_KEY", withKey ? "chave-de-teste" : "");
  vi.stubEnv("VITE_TMDB_API_TOKEN", "");
  return (await import("./movie-service")).movieService;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("com as chaves do TMDB configuradas", () => {
  it("uma falha da API vira erro, nunca filmes de demonstração", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("rede fora do ar"));
    vi.stubGlobal("fetch", fetchMock);
    const service = await loadService(true);

    await expect(service.getTrendingMovies()).rejects.toThrow();
    await expect(service.getMovieById(157336)).rejects.toThrow();
    await expect(service.getMovieCredits(157336)).rejects.toThrow();
    await expect(service.getMovieWatchProviders(157336)).rejects.toThrow();
    await expect(service.getPopularMovies()).rejects.toThrow();
    await expect(service.getMoviesByGenre("Drama")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("uma resposta de erro do TMDB também vira erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429, statusText: "Too Many Requests" })));
    const service = await loadService(true);
    await expect(service.searchMovies("matrix")).rejects.toThrow(/429/);
  });

  it("busca vazia não consulta a API nem devolve demonstração", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = await loadService(true);
    const result = await service.searchMovies("   ");
    expect(result.results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("o Hero sem resposta suficiente fica vazio, sem filmes de demonstração", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 })));
    const service = await loadService(true);
    expect(await service.getHeroFeaturedMovies()).toEqual([]);
  });
});

describe("sem as chaves do TMDB (modo demonstração)", () => {
  it("responde com os filmes de exemplo, sem nenhuma chamada ao TMDB", async () => {
    // A lista curada da categoria (arquivo do próprio site) é tentada antes; falhar nela leva à demonstração
    const fetchMock = vi.fn().mockRejectedValue(new Error("arquivo indisponível"));
    vi.stubGlobal("fetch", fetchMock);
    const service = await loadService(false);

    expect((await service.getMovieById(157336))?.title).toBe("Interestelar");
    expect(await service.getMovieById(999999999)).toBeNull();
    expect((await service.getPopularMovies()).results.length).toBeGreaterThan(0);
    expect((await service.searchMovies("interestelar")).results[0]?.id).toBe(157336);
    expect((await service.getMoviesByGenre("Drama")).results.length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("themoviedb"))).toEqual([]);
  });
});
