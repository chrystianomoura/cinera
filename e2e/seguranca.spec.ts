import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "./fixtures";

const headersFile = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/_headers"), "utf8");

/** Cabeçalhos do bloco "/*" de public/_headers, que o Cloudflare Pages aplica a todas as respostas. */
function globalHeaders(): Record<string, string> {
  const block = headersFile.split(/\n(?=\S)/).find((b) => b.startsWith("/*")) ?? "";
  return Object.fromEntries(
    block
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.includes(":") && !line.startsWith("#"))
      .map((line) => [line.slice(0, line.indexOf(":")).trim().toLowerCase(), line.slice(line.indexOf(":") + 1).trim()]),
  );
}

test("public/_headers define os cabeçalhos de segurança essenciais", () => {
  const headers = globalHeaders();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toMatch(/max-age=\d{7,}/);
});

test("o site funciona sob a política de segurança e nada é bloqueado por ela", async ({ page }) => {
  const csp = globalHeaders()["content-security-policy"];
  // Serve as páginas com a política real; o upgrade para https não vale em http://localhost
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": csp.replace("; upgrade-insecure-requests", "") } });
  });
  await page.addInitScript(() => {
    (window as unknown as { __violations: string[] }).__violations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __violations: string[] }).__violations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeVisible();
  await page.getByRole("group", { name: /Filtrar catálogo/ }).getByRole("button", { name: "Drama" }).click();
  await expect(page.locator(".movie-card [role=button]").first()).toBeVisible();
  await page.locator(".movie-card [role=button]").first().click();
  await expect(page.getByRole("dialog", { name: /Detalhes do filme/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /esquis/i }).first().click();
  await page.getByRole("combobox").fill("interestelar");
  await expect(page.locator("[id^=search-item-]").first()).toBeVisible();

  const violations = await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
  expect(violations).toEqual([]);
});
