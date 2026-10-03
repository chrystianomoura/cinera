import { test as base, expect } from "@playwright/test";

/**
 * Os testes ponta a ponta não dependem de rede externa: pôsteres, TMDB, OMDb e YouTube são bloqueados.
 * O catálogo, o índice de categorias e as listas são arquivos estáticos do próprio site.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(/(image\.tmdb\.org|api\.themoviedb\.org|omdbapi\.com|youtube)/, (route) => route.abort());
    await provide(page);
  },
});

export { expect };
