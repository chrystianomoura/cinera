import { expect, test } from "./fixtures";

// Com as chaves configuradas, uma falha do TMDB nunca vira filmes de demonstração: a tela mostra o erro.

test("a ficha sem a lista de provedores avisa em vez de dizer que o filme não está em nenhuma plataforma", async ({ page }) => {
  await page.goto("/?filme=157336");
  const dialog = page.getByRole("dialog", { name: /Detalhes do filme/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Não foi possível carregar onde assistir/)).toBeVisible();
  await expect(dialog.getByText(/Não encontramos este filme em assinatura ou aluguel/)).toHaveCount(0);
});

test("a pesquisa mostra o erro e o botão de tentar novamente quando a API cai", async ({ page }) => {
  await page.route(/\/api\/tmdb\//, (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: /esquis/i }).first().click();
  await page.getByRole("combobox").fill("interestelar");
  await expect(page.getByRole("button", { name: /tentar novamente/i })).toBeVisible();
  await expect(page.locator("[id^=search-item-]")).toHaveCount(0);
});

test("um link direto com a API fora do ar não quebra a Home", async ({ page }) => {
  await page.route(/\/api\/tmdb\//, (route) => route.abort());
  await page.goto("/?filme=157336");
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: /Detalhes do filme/ })).toBeHidden();
});
