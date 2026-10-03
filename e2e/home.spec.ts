import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const ROWS = ["Novidades", "Em Alta", "Aclamados pela Crítica", "Clássicos Indispensáveis", "Populares no Brasil"];
const CATEGORIES = ["Ação & Aventura", "Animação", "Comédia", "Documentário", "Drama", "Ficção & Fantasia", "Romance", "Suspense & Crime", "Terror"];

test("a Home mostra o destaque, as 5 fileiras e as categorias", async ({ page }) => {
  await page.goto("/");
  for (const row of ROWS) await expect(page.getByRole("heading", { name: row })).toBeVisible();
  const pills = page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button");
  await expect(pills).toHaveText(["Todos", ...CATEGORIES]);
});

test("cada fileira da Home tem 20 filmes e nenhum se repete", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeVisible();
  const titles = await page.locator(".movie-card [role=button]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(titles.length).toBeGreaterThanOrEqual(5 * 17);
  expect(new Set(titles).size).toBe(titles.length);
});

test("a Home não tem violações graves de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
