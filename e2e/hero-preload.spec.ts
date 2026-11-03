import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

// Estes testes olham o que o build REALMENTE publicou (o Playwright faz `npm run build` e serve o dist), e não só as funções
// do plugin: o build baixa as originais do destaque na TMDB e as recodifica em AVIF, e o index.html precarrega a primeira.
// Se isso falhar (sem rede, por exemplo), o build avisa e o site cai no plano B, mas estes testes falham de propósito:
// perder o AVIF deixa a foto bem mais pesada, e isso não pode passar em silêncio.

const preloadLink = (html: string) => html.match(/<link\b[^>]*\brel="preload"[^>]*\bas="image"[^>]*>/)?.[0];
const attr = (tag: string | undefined, name: string) => tag?.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];

test("o index.html publicado precarrega o AVIF da primeira foto do destaque, do próprio domínio", async ({ request }) => {
  const link = preloadLink(await (await request.get("/")).text());
  expect(link, "o index.html não tem <link rel=preload as=image>").toBeTruthy();
  expect(attr(link, "type")).toBe("image/avif");
  expect(attr(link, "fetchpriority")).toBe("high");

  const catalog = await (await request.get("/catalog.json")).json();
  const name = (catalog.hero[0].backdropPath as string).slice(1).replace(/\.\w+$/, "");
  const href = attr(link, "href");
  expect(href).toMatch(new RegExp(`^/hero/${name}\\.[0-9a-f]{8}\\.avif$`));

  const file = await request.get(href!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("image/avif");
  expect((await file.body()).length, "o AVIF publicado está pequeno demais para ser uma foto").toBeGreaterThan(50_000);
});

test("o <img> do destaque usa exatamente o AVIF do preload, carrega de verdade e aparece com o tamanho certo", async ({ page, request }) => {
  const href = attr(preloadLink(await (await request.get("/")).text()), "href");
  expect(href, "preload sem href").toBeTruthy();

  await page.goto("/");
  const hero = page.getByRole("region", { name: "Destaque em cartaz" }).locator("img").first();
  await expect(hero).toBeAttached();

  const chosen = await hero.evaluate((img: HTMLImageElement) => img.currentSrc);
  expect(new URL(chosen).pathname, "o <img> escolheu outra foto que não a do preload (seria baixada duas vezes)").toBe(href);
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { message: "o AVIF não carregou" }).toBe(3840);

  const box = await hero.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 2);
  expect(box!.height, "o <picture> estragou o layout do destaque").toBeGreaterThan(400);
});

test("o _headers manda guardar as fotos do destaque (/hero/*) por 1 ano, já que o hash está no nome", () => {
  const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf-8");
  expect(headers).toMatch(/^\/hero\/\*\s*\n\s+Cache-Control:.*max-age=31536000.*immutable/m);
});
