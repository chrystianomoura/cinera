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

// A seção do elenco (e a linha que a separa da anterior) só existe se houver ator com foto para mostrar.
const credits = (cast: { id: number; name: string; profile_path: string | null }[]) => ({
  id: 157336,
  cast: cast.map((a, i) => ({ ...a, character: "Personagem", order: i })),
  crew: [],
});

test("sem ator com foto, a seção do elenco não aparece e não sobra linha solta", async ({ page }) => {
  await page.route(/\/api\/tmdb\/movie\/157336\/credits/, (route) =>
    route.fulfill({ json: credits([{ id: 1, name: "Sem Foto", profile_path: null }, { id: 2, name: "Também Sem", profile_path: null }]) }),
  );
  await page.goto("/?filme=157336");
  const dialog = page.getByRole("dialog", { name: /Detalhes do filme/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Sinopse" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Elenco Principal" })).toBeHidden();
  // só a Sinopse sobrou: nenhuma seção vazia com linha
  await expect(dialog.locator("section.pt-6, section[class*='pt-6']")).toHaveCount(1);
});

test("com ator com foto, a seção do elenco aparece", async ({ page }) => {
  await page.route(/\/api\/tmdb\/movie\/157336\/credits/, (route) =>
    route.fulfill({ json: credits([{ id: 1, name: "Com Foto", profile_path: "/foto.jpg" }]) }),
  );
  await page.goto("/?filme=157336");
  const dialog = page.getByRole("dialog", { name: /Detalhes do filme/ });
  await expect(dialog.getByRole("heading", { name: "Elenco Principal" })).toBeVisible();
  await expect(dialog.locator("section[class*='pt-6']")).toHaveCount(2);
});

// Celular deitado: tela larga e baixa. A ficha não pode rolar para o lado e o essencial tem de caber na primeira tela.
test.describe("celular deitado", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "só no celular"));

  for (const [nome, width, height] of [["iPhone 15 Pro", 852, 393], ["iPhone SE", 667, 375]] as const) {
    test(`a ficha cabe na tela, sem rolagem lateral (${nome} ${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/?filme=157336");
      const dialog = page.getByRole("dialog", { name: /Detalhes do filme/ });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Trailer" })).toBeVisible();

      const lateral = await dialog.evaluate((d) => d.scrollWidth - d.clientWidth);
      expect(lateral).toBeLessThanOrEqual(1);

      // os três botões ficam na mesma linha
      const topos = await Promise.all(
        ["Trailer", "Quero Assistir", "Já Assisti"].map((nomeBotao) =>
          dialog.getByRole("button", { name: nomeBotao }).evaluate((b) => Math.round(b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2)),
        ),
      );
      expect(Math.max(...topos) - Math.min(...topos)).toBeLessThanOrEqual(6);
    });

    test(`o trailer abre e dá para fechá-lo tocando (${nome} ${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/?filme=157336");
      await page.getByRole("dialog", { name: /Detalhes do filme/ }).getByRole("button", { name: "Trailer", exact: true }).click();

      // o botão de fechar tem de estar inteiro dentro da tela (antes o painel passava da altura e ele ficava acima do topo)
      const fechar = page.getByTitle("Fechar", { exact: true });
      await expect(fechar).toBeVisible();
      const caixa = await fechar.boundingBox();
      expect(caixa!.y).toBeGreaterThanOrEqual(0);
      expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(height);

      await fechar.click();
      await expect(fechar).toBeHidden();
    });

    test(`a foto ampliada da galeria abre e dá para fechá-la tocando (${nome} ${width}×${height})`, async ({ page }) => {
      await page.route(/\/api\/tmdb\/movie\/157336\/images/, (route) =>
        route.fulfill({ json: { backdrops: [{ file_path: "/cena1.jpg" }, { file_path: "/cena2.jpg" }] } }),
      );
      await page.setViewportSize({ width, height });
      await page.goto("/?filme=157336");
      const cena = page.getByRole("button", { name: "Ampliar cena 1" });
      await cena.scrollIntoViewIfNeeded();
      await cena.click();

      const visualizador = page.getByRole("dialog", { name: /Visualizador de fotos/ });
      await expect(visualizador).toBeVisible();
      const fechar = visualizador.getByTitle("Fechar (Esc)");
      const caixa = await fechar.boundingBox();
      expect(caixa!.y).toBeGreaterThanOrEqual(0);
      expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(height);

      await fechar.click();
      await expect(visualizador).toBeHidden();
    });

    test(`tocar fora do painel também fecha o trailer (${nome})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/?filme=157336");
      await page.getByRole("dialog", { name: /Detalhes do filme/ }).getByRole("button", { name: "Trailer", exact: true }).click();
      const fechar = page.getByTitle("Fechar", { exact: true });
      await expect(fechar).toBeVisible();
      await page.mouse.click(2, height - 2);
      await expect(fechar).toBeHidden();
    });
  }
});
