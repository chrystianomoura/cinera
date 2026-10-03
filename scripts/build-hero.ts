// Monta o destaque do catálogo: o melhor filme de cada uma das 5 fileiras (já curadas) em public/catalog.json.
// Uso: npm run curate:hero
// O destaque exige imagem de fundo e tagline. Filmes aprovados à mão para a fileira
// (scripts/curation/hero-approved.json, com boa imagem no celular) têm prioridade e dispensam a tagline;
// sem nenhum aprovado na fileira, vale o primeiro elegível.
// Um filme nunca é destaque duas vezes. O app retira os filmes do destaque das fileiras ao exibir a Home.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSchema, CATALOG_ROW_IDS } from "../src/infrastructure/catalog/catalog-schema.js";

const approvedByRow = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "curation", "hero-approved.json"), "utf8"),
) as Record<string, { id: number }[]>;
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "catalog.json");
const catalog = catalogSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));

const missing = CATALOG_ROW_IDS.filter((id) => !catalog.rows.some((row) => row.id === id));
if (missing.length > 0) {
  console.error(`Faltam fileiras curadas para montar o destaque: ${missing.join(", ")}`);
  process.exit(1);
}

const used = new Set<number>();
const hero = CATALOG_ROW_IDS.map((id) => {
  const row = catalog.rows.find((r) => r.id === id)!;
  const approved = new Set((approvedByRow[id] ?? []).map((m) => m.id));
  const free = row.movies.filter((m) => !used.has(m.id) && m.backdropPath);
  const pick = free.find((m) => approved.has(m.id)) ?? free.find((m) => m.tagline?.trim());
  if (!pick) throw new Error(`Nenhum filme da fileira "${id}" tem imagem de fundo e tagline`);
  used.add(pick.id);
  const position = row.movies.indexOf(pick) + 1;
  console.log(`${id.padEnd(10)} → ${pick.title} (posição ${position} da fileira${approved.has(pick.id) ? ", aprovado" : ""})`);
  return pick;
});

fs.writeFileSync(file, JSON.stringify({ ...catalog, hero }));
console.log(`\nDestaque gravado em public/catalog.json com ${hero.length} filmes.`);
