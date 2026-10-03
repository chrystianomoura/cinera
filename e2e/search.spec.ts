import { expect, test } from "./fixtures";

const CATEGORIES = ["Ação & Aventura", "Animação", "Comédia", "Documentário", "Drama", "Ficção & Fantasia", "Romance", "Suspense & Crime", "Terror"];

test("a pesquisa abre com o campo focado e sugere só as categorias do Cinera", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /esquis/i }).first().click();
  const dialog = page.getByRole("dialog", { name: /Pesquisa/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox")).toBeFocused();
  for (const category of CATEGORIES) await expect(dialog.getByRole("button", { name: category })).toBeVisible();
});

test("escolher uma categoria na pesquisa leva à lista dela", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /esquis/i }).first().click();
  await page.getByRole("dialog", { name: /Pesquisa/ }).getByRole("button", { name: "Romance" }).click();
  await expect(page.getByRole("dialog", { name: /Pesquisa/ })).toBeHidden();
  await expect(page.locator(".movie-card [role=button]").first()).toBeVisible();
});

test("Escape fecha a pesquisa e devolve a rolagem da página", async ({ page }) => {
  await page.goto("/");
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => Math.round(window.scrollY));
  await page.getByRole("button", { name: /esquis/i }).first().click();
  await expect(page.getByRole("dialog", { name: /Pesquisa/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Pesquisa/ })).toBeHidden();
  expect(Math.abs((await page.evaluate(() => Math.round(window.scrollY))) - before)).toBeLessThan(5);
});
