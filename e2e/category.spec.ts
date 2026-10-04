import { expect, test } from "./fixtures";

test("abrir uma categoria mostra uma lista pronta e a rolagem carrega mais filmes", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button", { name: "Drama" }).click();

  // Espera a Home sair de cena: só então os cards na tela são os da categoria
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeHidden();
  const cards = page.locator(".movie-card [role=button]");
  await expect(cards.first()).toBeVisible();
  const first = await cards.count();
  expect(first).toBeGreaterThanOrEqual(18);

  await page.mouse.wheel(0, 20_000);
  await expect.poll(() => cards.count(), { timeout: 8000 }).toBeGreaterThan(first);

  expect(requests.some((u) => u.endsWith("/genres/drama.json"))).toBe(true);
  expect(requests.filter((u) => u.includes("/api/tmdb/") && u.includes("discover"))).toEqual([]);
});

test("os filmes da lista não se repetem", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button", { name: "Terror" }).click();
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeHidden();
  const cards = page.locator(".movie-card [role=button]");
  await expect(cards.first()).toBeVisible();
  const before = await cards.count();
  await page.mouse.wheel(0, 20_000);
  await expect.poll(() => cards.count(), { timeout: 8000 }).toBeGreaterThan(before);
  // Título + ano: refilmagens com o mesmo título (Frankenstein 1931 e 2025) são filmes diferentes
  const identities = await page.locator(".movie-card").evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.replace(/\s+/g, " ").trim()));
  expect(new Set(identities).size).toBe(identities.length);
});
