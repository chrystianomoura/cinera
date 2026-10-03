// Botão único: monta o catálogo inteiro na ordem certa e só publica se tudo passar nas verificações.
// Uso: npm run build:catalog
//      npm run build:catalog -- --accept-changes   (aceita uma mudança grande de propósito, como trocar regras)
// Se qualquer passo falhar, o catálogo anterior volta intacto e o comando termina com erro.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateCatalog } from "./curation/validate.js";
import { CATALOG_ROW_IDS, type Catalog } from "../src/infrastructure/catalog/catalog-schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "public", "catalog.json");
const backup = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
const previous: Catalog | null = backup ? (JSON.parse(backup) as Catalog) : null;

// O destaque vem por último: depende das 5 fileiras prontas
const STEPS: { name: string; script: string; args: string[] }[] = [
  { name: "Aclamados", script: "curate-aclamados.ts", args: ["--write"] },
  { name: "Clássicos", script: "curate-classicos.ts", args: ["--write"] },
  { name: "Em Alta", script: "curate-em-alta.ts", args: ["--write"] },
  { name: "Novidades", script: "curate-novidades.ts", args: ["--write"] },
  { name: "Populares", script: "curate-populares.ts", args: ["--write"] },
  { name: "Destaque", script: "build-hero.ts", args: [] },
];

function restore(reason: string): never {
  if (backup !== null) fs.writeFileSync(file, backup);
  console.error(`\nCatálogo NÃO atualizado: ${reason}. O catálogo anterior foi mantido.`);
  process.exit(1);
}

for (const step of STEPS) {
  console.log(`\n=== ${step.name} ===`);
  const result = spawnSync("npx", ["tsx", path.join("scripts", step.script), ...step.args], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) restore(`o passo "${step.name}" falhou`);
}

const { errors, catalog } = validateCatalog(JSON.parse(fs.readFileSync(file, "utf8")), previous, {
  acceptBigChanges: process.argv.includes("--accept-changes"),
});
if (errors.length > 0 || !catalog) {
  for (const e of errors) console.error(`  - ${e}`);
  restore(`${errors.length} verificação(ões) falharam`);
}

// Relatório do que mudou
console.log("\n=== O que mudou ===");
for (const id of CATALOG_ROW_IDS) {
  const now = catalog!.rows.find((r) => r.id === id)!.movies;
  const before = previous?.rows.find((r) => r.id === id)?.movies ?? [];
  const old = new Set(before.map((m) => m.id));
  const cur = new Set(now.map((m) => m.id));
  const entered = now.filter((m) => !old.has(m.id)).map((m) => m.title);
  const left = before.filter((m) => !cur.has(m.id)).map((m) => m.title);
  console.log(`${id}: ${now.length} filmes | entraram ${entered.length}${entered.length ? ` (${entered.join(", ")})` : ""} | saíram ${left.length}${left.length ? ` (${left.join(", ")})` : ""}`);
}
console.log(`destaque: ${(catalog!.hero ?? []).map((m) => m.title).join(" | ")}`);
console.log("\nCatálogo atualizado com sucesso.");
