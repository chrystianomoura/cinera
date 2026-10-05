import { expect, test } from "./fixtures";

// Chrome no iPhone: a barra de baixo redimensiona a página ao rolar e a Home engasga. Nesses navegadores a página rola por
// dentro de #root (modo "shell"), não pela janela. No Safari nada muda.
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const rootScroll = (page: import("@playwright/test").Page) => page.evaluate(() => document.getElementById("root")!.scrollTop);
const windowScroll = (page: import("@playwright/test").Page) => page.evaluate(() => window.scrollY);

test.describe("modo shell (Chrome no iPhone)", () => {
  test.use({ userAgent: IPHONE_CHROME });
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "só no celular"));

  test("a página rola por dentro de #root e a janela fica parada", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/shell/);
    await page.evaluate(() => document.getElementById("root")!.scrollTo(0, 700));
    await expect.poll(() => rootScroll(page)).toBeGreaterThan(300);
    expect(await windowScroll(page)).toBe(0);
  });

  test("a seta de voltar ao topo e a troca de categoria funcionam", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button", { name: "Drama" }).click();
    await expect(page.getByRole("heading", { name: "Novidades" })).toBeHidden();
    await expect(page.locator(".movie-card [role=button]").first()).toBeVisible();

    await page.evaluate(() => document.getElementById("root")!.scrollTo(0, 1800));
    const seta = page.getByRole("button", { name: "Voltar ao topo do catálogo" });
    await expect(seta).toHaveCSS("opacity", "1");
    await seta.click();
    await expect.poll(() => rootScroll(page), { timeout: 5000 }).toBe(0);
  });

  test("a ficha trava a rolagem de trás e a devolve ao fechar", async ({ page }) => {
    await page.goto("/?filme=157336");
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.getElementById("root")!.style.overflowY)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await page.evaluate(() => document.getElementById("root")!.style.overflowY)).toBe("");
  });
});

test.describe("sem o modo shell (Safari)", () => {
  test.use({ userAgent: IPHONE_SAFARI });
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "só no celular"));

  test("a janela rola normalmente", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/shell/);
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => windowScroll(page)).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.getElementById("root")!.scrollTop)).toBe(0);
  });
});
