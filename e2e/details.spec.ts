import { expect, test } from "./fixtures";

const CATEGORIES = ["Ação & Aventura", "Animação", "Comédia", "Documentário", "Drama", "Ficção & Fantasia", "Romance", "Suspense & Crime", "Terror"];

test("a ficha de um filme da lista mostra a categoria que o usuário escolheu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button", { name: "Comédia" }).click();
  await page.locator(".movie-card [role=button]").first().click();

  const dialog = page.getByRole("dialog", { name: /Detalhes do filme/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Comédia/).first()).toBeVisible();
});

test("a ficha mostra só nomes das categorias do Cinera", async ({ page }) => {
  await page.goto("/");
  await page.locator(".movie-card [role=button]").first().click();
  const dialog = page.getByRole("dialog", { name: /Detalhes do filme/ });
  await expect(dialog).toBeVisible();
  const text = (await dialog.innerText()).split("\n");
  const label = text.find((line) => line.split(" / ").every((part) => CATEGORIES.includes(part.trim())) && line.trim().length > 0);
  expect(label).toBeTruthy();
});

test("Escape fecha a ficha e volta para a página", async ({ page }) => {
  await page.goto("/");
  await page.locator(".movie-card [role=button]").first().click();
  await expect(page.getByRole("dialog", { name: /Detalhes do filme/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Detalhes do filme/ })).toBeHidden();
});

test("o link direto de um filme abre a ficha", async ({ page }) => {
  // Sem rede e sem chaves, o app usa os dados de demonstração: 157336 (Interestelar) está entre eles
  await page.goto("/?filme=157336");
  await expect(page.getByRole("dialog", { name: /Detalhes do filme/ })).toBeVisible();
});
