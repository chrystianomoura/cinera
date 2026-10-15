import { expect, test } from "./fixtures";

// Estes testes olham o que o build REALMENTE publicou (o Playwright faz `npm run build` e serve o dist), e não só a função
// que monta o preload: se o plugin parar de funcionar, o index.html sai sem o preload e estes testes falham.

const preloadLink = (html: string) => html.match(/<link\b[^>]*\brel="preload"[^>]*\bas="image"[^>]*>/)?.[0];

test("o index.html publicado traz o preload da primeira foto do destaque do catálogo do dia", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const catalog = await (await request.get("/catalog.json")).json();
  const first: string = catalog.hero[0].backdropPath;

  const link = preloadLink(html);
  expect(link, "o index.html não tem <link rel=preload as=image>").toBeTruthy();
  expect(link).toContain(`href="https://image.tmdb.org/t/p/w1280${first}"`);
  expect(link).toContain(`https://image.tmdb.org/t/p/w780${first} 780w`);
  expect(link).toContain('fetchpriority="high"');
  expect(link).not.toContain("original");
});

test("o <img> do destaque escolhe exatamente a foto do preload (senão ela seria baixada duas vezes)", async ({ page, request }) => {
  const link = preloadLink(await (await request.get("/")).text());
  const href = link?.match(/\bhref="([^"]+)"/)?.[1];
  expect(href, "preload sem href").toBeTruthy();

  await page.goto("/");
  const hero = page.getByRole("region", { name: "Destaque em cartaz" }).locator("img").first();
  await expect(hero).toBeAttached();

  const chosen = await hero.evaluate((img: HTMLImageElement) => img.currentSrc || img.src);
  expect(chosen).toBe(href);
});
