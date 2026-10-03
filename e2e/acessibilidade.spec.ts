import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const graves = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical" || v.impact === "moderate")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(" ").slice(0, 100)}`);
};

test("a categoria não tem violações de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button", { name: "Drama" }).click();
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeHidden();
  await expect(page.locator(".movie-card [role=button]").first()).toBeVisible();
  expect(await graves(page)).toEqual([]);
});

test("a ficha não tem violações de acessibilidade", async ({ page }) => {
  await page.goto("/?filme=157336");
  await expect(page.getByRole("dialog", { name: /Detalhes do filme/ })).toBeVisible();
  await page.waitForTimeout(600);
  expect(await graves(page)).toEqual([]);
});

test("a pesquisa com resultados não tem violações de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /esquis/i }).first().click();
  await page.getByRole("combobox").fill("interestelar");
  await expect(page.locator("[id^=search-item-]").first()).toBeVisible();
  expect(await graves(page)).toEqual([]);
});

test("a biblioteca vazia não tem violações de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /biblioteca/i }).first().click();
  await expect(page.getByRole("dialog").first()).toBeVisible();
  expect(await graves(page)).toEqual([]);
});
