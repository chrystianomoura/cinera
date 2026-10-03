import { test as base, expect } from "@playwright/test";

const movie = (id: number, title: string, original: string, year: number, genres: number[]) => ({
  id,
  title,
  original_title: original,
  overview: "Sinopse de demonstração com mais de vinte caracteres para o teste.",
  poster_path: "/demo.jpg",
  backdrop_path: "/demo.jpg",
  vote_average: 8.1,
  vote_count: 5000,
  popularity: 50,
  release_date: `${year}-01-01`,
  genre_ids: genres,
});

const SEARCH_RESULTS = [
  movie(157336, "Interestelar", "Interstellar", 2014, [12, 18, 878]),
  movie(1, "Interestelar: Bastidores", "Interstellar: Behind the Scenes", 2015, [99]),
  movie(2, "Estrelas Perdidas", "Lost Stars", 2010, [18, 10749]),
];

/**
 * Os testes ponta a ponta não dependem de rede externa: pôsteres, OMDb e YouTube são bloqueados e o TMDB é
 * simulado (só a pesquisa responde, com filmes de demonstração; o resto falha e o app usa os dados locais).
 * O catálogo, o índice de categorias e as listas são arquivos estáticos do próprio site.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(/(image\.tmdb\.org|omdbapi\.com|youtube)/, (route) => route.abort());
    await page.route(/api\.themoviedb\.org/, (route) => {
      const url = route.request().url();
      if (url.includes("/search/movie")) return route.fulfill({ json: { page: 1, total_pages: 1, total_results: SEARCH_RESULTS.length, results: SEARCH_RESULTS } });
      if (url.includes("/search/collection")) return route.fulfill({ json: { page: 1, total_pages: 1, total_results: 0, results: [] } });
      return route.abort();
    });
    await provide(page);
  },
});

export { expect };
