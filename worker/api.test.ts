import { describe, it, expect, vi } from "vitest";
import { handleApi, type ResponseCache } from "./api";

const memoryCache = (): ResponseCache => {
  const store = new Map<string, Response>();
  return {
    match: async (r) => store.get(r.url)?.clone(),
    put: async (r, res) => void store.set(r.url, res),
  };
};
const env = { TMDB_TOKEN: "segredo-tmdb", OMDB_KEY: "segredo-omdb" };
const get = (path: string) => new Request(`https://cinera.party${path}`);

describe("Worker da API", () => {
  it("repassa uma rota permitida do TMDB com o token só no cabeçalho do servidor", async () => {
    const f = vi.fn(async () => new Response('{"ok":true}'));
    const res = await handleApi(get("/api/tmdb/movie/603?language=pt-BR&api_key=x"), env, memoryCache(), f as unknown as typeof fetch);
    expect(res.status).toBe(200);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.themoviedb.org/3/movie/603?language=pt-BR");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer segredo-tmdb");
    expect(JSON.stringify([...res.headers])).not.toContain("segredo");
  });

  it.each(["/api/tmdb/account", "/api/tmdb/movie/abc", "/api/tmdb/movie/1/reviews", "/api/tmdb/authentication/token/new", "/api/outra"])(
    "recusa a rota %s",
    async (path) => {
      const f = vi.fn();
      const res = await handleApi(get(path), env, memoryCache(), f as unknown as typeof fetch);
      expect(res.status).toBe(404);
      expect(f).not.toHaveBeenCalled();
    },
  );

  it("recusa pedidos que partem de outros sites, mas aceita o próprio site e quem não envia o cabeçalho", async () => {
    const f = vi.fn(async () => Response.json({ Response: "True", imdbRating: "7.0", imdbVotes: "1" }));
    const ask = (site?: string) =>
      handleApi(new Request("https://cinera.party/api/omdb?i=tt0133093", { headers: site ? { "sec-fetch-site": site } : {} }), env, memoryCache(), f as unknown as typeof fetch);
    expect((await ask("cross-site")).status).toBe(403);
    expect((await ask("same-site")).status).toBe(403);
    expect((await ask("same-origin")).status).toBe(200);
    expect((await ask()).status).toBe(200);
  });

  it("só aceita GET", async () => {
    const res = await handleApi(new Request("https://cinera.party/api/omdb?i=tt0133093", { method: "POST" }), env, memoryCache());
    expect(res.status).toBe(405);
  });

  it("guarda a resposta e não consulta o TMDB de novo", async () => {
    const f = vi.fn(async () => new Response('{"a":1}'));
    const cache = memoryCache();
    await handleApi(get("/api/tmdb/movie/popular?page=1"), env, cache, f as unknown as typeof fetch);
    await handleApi(get("/api/tmdb/movie/popular?page=1"), env, cache, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("não guarda erro do TMDB", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 429 }));
    const cache = memoryCache();
    const res = await handleApi(get("/api/tmdb/movie/popular"), env, cache, f as unknown as typeof fetch);
    await handleApi(get("/api/tmdb/movie/popular"), env, cache, f as unknown as typeof fetch);
    expect(res.status).toBe(429);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("OMDb: valida o código, usa a chave no servidor e devolve só a nota", async () => {
    const f = vi.fn(async () => Response.json({ Response: "True", imdbRating: "8.7", imdbVotes: "2,000,000", Plot: "x", Website: "y" }));
    const res = await handleApi(get("/api/omdb?i=tt0133093"), env, memoryCache(), f as unknown as typeof fetch);
    expect(await res.json()).toEqual({ Response: "True", imdbRating: "8.7", imdbVotes: "2,000,000" });
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain("apikey=segredo-omdb");
    expect((await handleApi(get("/api/omdb?i=../x"), env, memoryCache())).status).toBe(400);
  });

  it("sem secret configurado responde 503, sem chamar ninguém", async () => {
    const f = vi.fn();
    expect((await handleApi(get("/api/tmdb/movie/1"), {}, memoryCache(), f as unknown as typeof fetch)).status).toBe(503);
    expect((await handleApi(get("/api/omdb?i=tt1"), {}, memoryCache(), f as unknown as typeof fetch)).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("recusa consulta enorme", async () => {
    expect((await handleApi(get(`/api/tmdb/search/movie?query=${"a".repeat(600)}`), env, memoryCache())).status).toBe(414);
  });
});
