// Botão único: monta o catálogo inteiro na ordem certa e só publica se tudo passar nas verificações.
// Uso: npm run build:catalog
//      npm run build:catalog -- --accept-changes   (aceita uma mudança grande de propósito, como trocar regras)
// Se qualquer passo falhar, o catálogo anterior volta intacto e o comando termina com erro.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildImdbRatings } from "./curation/imdb-ratings.js";
import { validateCatalog, validateGenres } from "./curation/validate.js";
import { GENRE_SLUGS, GENRES } from "../src/features/catalog/constants.js";
import { CATALOG_ROW_IDS, type Catalog } from "../src/infrastructure/catalog/catalog-schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "public", "catalog.json");
const backup = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
const previous: Catalog | null = backup ? (JSON.parse(backup) as Catalog) : null;

const genreFile = (name: (typeof GENRES)[number]) => path.join(root, "public", "genres", `${GENRE_SLUGS[name]}.json`);
const genreBackup = new Map(GENRES.map((name) => [name, fs.existsSync(genreFile(name)) ? fs.readFileSync(genreFile(name), "utf8") : null]));

// O destaque vem por último: depende das 5 fileiras prontas
const STEPS: { name: string; script: string; args: string[] }[] = [
  { name: "Aclamados", script: "curate-aclamados.ts", args: ["--write"] },
  { name: "Clássicos", script: "curate-classicos.ts", args: ["--write"] },
  { name: "Em Alta", script: "curate-em-alta.ts", args: ["--write"] },
  { name: "Novidades", script: "curate-novidades.ts", args: ["--write"] },
  { name: "Populares", script: "curate-populares.ts", args: ["--write"] },
  { name: "Categorias", script: "curate-generos.ts", args: ["--write"] },
  { name: "Destaque", script: "build-hero.ts", args: [] },
];

function restore(reason: string): never {
  if (backup !== null) fs.writeFileSync(file, backup);
  for (const [name, content] of genreBackup) {
    if (content !== null) fs.writeFileSync(genreFile(name), content);
    else if (fs.existsSync(genreFile(name))) fs.rmSync(genreFile(name));
  }
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

const genreErrors = validateGenres((name) => (fs.existsSync(genreFile(name)) ? JSON.parse(fs.readFileSync(genreFile(name), "utf8")) : null));
if (genreErrors.length > 0) {
  for (const e of genreErrors) console.error(`  - ${e}`);
  restore(`${genreErrors.length} verificação(ões) das categorias falharam`);
}

// Notas do IMDb de todos os filmes do catálogo, para a ficha mostrar sem consultar o OMDb ao vivo
const allIds = new Set<number>();
for (const row of catalog!.rows) for (const m of row.movies) allIds.add(m.id);
for (const m of catalog!.hero ?? []) allIds.add(m.id);
for (const name of GENRES) for (const m of (JSON.parse(fs.readFileSync(genreFile(name), "utf8")) as { movies: { id: number }[] }).movies) allIds.add(m.id);
const { ratings, missing } = await buildImdbRatings([...allIds]);
if (missing.length > allIds.size * 0.02) restore(`${missing.length} de ${allIds.size} filmes ficaram sem nota do IMDb`);
fs.writeFileSync(path.join(root, "public", "imdb.json"), JSON.stringify({ version: 1, ratings }));
console.log(`\nNotas do IMDb gravadas: ${Object.keys(ratings).length} filmes (${missing.length} sem nota).`);

// Índice id → categorias de todos os filmes do catálogo: a pesquisa e a ficha usam o mesmo resultado das listas
const indexed: Record<string, string[]> = {};
const collect = (movies: { id: number; categories?: string[] }[]) => {
  for (const movie of movies) if (movie.categories && movie.categories.length > 0) indexed[String(movie.id)] = movie.categories;
};
for (const row of catalog!.rows) collect(row.movies);
collect(catalog!.hero ?? []);
for (const name of GENRES) collect((JSON.parse(fs.readFileSync(genreFile(name), "utf8")) as { movies: { id: number; categories?: string[] }[] }).movies);
fs.writeFileSync(path.join(root, "public", "categories.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), categories: indexed }));
console.log(`\nÍndice de categorias gravado: ${Object.keys(indexed).length} filmes.`);

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
for (const name of GENRES) {
  const now = (JSON.parse(fs.readFileSync(genreFile(name), "utf8")) as { movies: { id: number; title: string }[] }).movies;
  const before = genreBackup.get(name) ? (JSON.parse(genreBackup.get(name)!) as { movies: { id: number }[] }).movies : [];
  const old = new Set(before.map((m) => m.id));
  console.log(`categoria ${name}: ${now.length} filmes | novos ${now.filter((m) => !old.has(m.id)).length}`);
}
console.log(`destaque: ${(catalog!.hero ?? []).map((m) => m.title).join(" | ")}`);
console.log("\nCatálogo atualizado com sucesso.");
