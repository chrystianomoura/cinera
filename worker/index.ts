import { handleApi, type ApiEnv } from "./api";

interface Env extends ApiEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    // O Cloudflare só chama este código para /api/*; o resto é servido pelos arquivos do site
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const cache = (caches as unknown as { default: Cache }).default;
    return handleApi(request, env, cache);
  },
};
