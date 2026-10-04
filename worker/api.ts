// Ponte entre o site e as APIs do TMDB e do OMDb: guarda as chaves no servidor (secrets do Cloudflare), só repassa
// as consultas que o app realmente faz e guarda as respostas por um tempo. Qualquer outra rota recebe 404.

export interface ApiEnv {
  TMDB_TOKEN?: string;
  OMDB_KEY?: string;
}

/** Cache mínimo (o `caches.default` do Cloudflare tem esta forma) */
export interface ResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const OMDB_BASE = "https://www.omdbapi.com/";

/** Só estes caminhos do TMDB (os que o app usa) passam */
const TMDB_ALLOWED: RegExp[] = [
  /^\/movie\/\d+$/,
  /^\/movie\/\d+\/(credits|images|release_dates|videos|watch\/providers)$/,
  /^\/movie\/popular$/,
  /^\/trending\/movie\/day$/,
  /^\/search\/(movie|collection)$/,
  /^\/collection\/\d+$/,
  /^\/discover\/movie$/,
];

const IMDB_ID = /^tt\d{1,10}$/;
const MAX_QUERY_LENGTH = 500;
const TMDB_CACHE_SECONDS = 60 * 60;
const OMDB_CACHE_SECONDS = 24 * 60 * 60;

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...extra },
  });

/** Responde com o que está no cache; senão consulta a origem e guarda só respostas boas */
async function cached(
  request: Request,
  cache: ResponseCache,
  seconds: number,
  origin: () => Promise<Response>,
): Promise<Response> {
  const key = new Request(request.url, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  const response = await origin();
  if (!response.ok) return response;
  const body = await response.text();
  const out = new Response(body, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${seconds}` },
  });
  await cache.put(key, out.clone());
  return out;
}

export async function handleApi(
  request: Request,
  env: ApiEnv,
  cache: ResponseCache,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Método não permitido" }, 405, { allow: "GET" });
  // Os navegadores informam de onde vem o pedido: recusa o que parte de outros sites (não impede um script
  // feito à mão, que pode omitir o cabeçalho; esse caso fica a cargo do limite de requisições do Cloudflare)
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return json({ error: "Origem não permitida" }, 403);
  const url = new URL(request.url);
  if (url.search.length > MAX_QUERY_LENGTH) return json({ error: "Consulta longa demais" }, 414);

  if (url.pathname.startsWith("/api/tmdb/")) {
    const path = url.pathname.slice("/api/tmdb".length);
    if (!TMDB_ALLOWED.some((rule) => rule.test(path))) return json({ error: "Rota não permitida" }, 404);
    if (!env.TMDB_TOKEN) return json({ error: "Serviço não configurado" }, 503);
    const params = new URLSearchParams(url.search);
    params.delete("api_key");
    const query = params.toString();
    return cached(request, cache, TMDB_CACHE_SECONDS, () =>
      fetchImpl(`${TMDB_BASE}${path}${query ? `?${query}` : ""}`, {
        headers: { accept: "application/json", authorization: `Bearer ${env.TMDB_TOKEN}` },
      }),
    );
  }

  if (url.pathname === "/api/omdb") {
    const id = url.searchParams.get("i")?.trim() ?? "";
    if (!IMDB_ID.test(id)) return json({ error: "Código do IMDb inválido" }, 400);
    if (!env.OMDB_KEY) return json({ error: "Serviço não configurado" }, 503);
    return cached(request, cache, OMDB_CACHE_SECONDS, async () => {
      const upstream = await fetchImpl(`${OMDB_BASE}?i=${id}&apikey=${encodeURIComponent(env.OMDB_KEY!)}`);
      if (!upstream.ok) return upstream;
      // Só devolve o que o site usa
      const data = (await upstream.json()) as Record<string, unknown>;
      return json({ Response: data.Response, imdbRating: data.imdbRating, imdbVotes: data.imdbVotes }, 200);
    });
  }

  return json({ error: "Não encontrado" }, 404);
}
