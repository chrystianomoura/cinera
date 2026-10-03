// Monta o destaque do catálogo: um filme de cada uma das 5 fileiras (já curadas) em public/catalog.json.
// Uso: npm run curate:hero            (grava o destaque em public/catalog.json)
//      npm run curate:hero -- --dry    (só mostra a escolha, sem gravar)
// Regras:
// - O destaque SEMPRE tem imagem de fundo e tagline.
// - Sai de uma vitrine com os primeiros filmes elegíveis da fileira e gira com a data (um por dia).
// - Um filme nunca é destaque duas vezes no mesmo dia.
// - scripts/curation/hero-blocked.json lista filmes que nunca devem ser destaque (opcional, por fileira).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSchema, CATALOG_ROW_IDS } from "../src/infrastructure/catalog/catalog-schema.js";
import { dayIndex } from "./curation/rotation.js";

/** Quantos filmes da fileira disputam o destaque (os melhores elegíveis) */
const SHOWCASE = 8;

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, "..", "public", "catalog.json");
const blockedByRow = JSON.parse(fs.readFileSync(path.join(here, "curation", "hero-blocked.json"), "utf8")) as Record<string, number[]>;
const catalog = catalogSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));

const missing = CATALOG_ROW_IDS.filter((id) => !catalog.rows.some((row) => row.id === id));
if (missing.length > 0) {
  console.error(`Faltam fileiras curadas para montar o destaque: ${missing.join(", ")}`);
  process.exit(1);
}

const day = dayIndex();
const used = new Set<number>();
const hero = CATALOG_ROW_IDS.map((id, rowIndex) => {
  const row = catalog.rows.find((r) => r.id === id)!;
  const blocked = new Set(blockedByRow[id] ?? []);
  const showcase = row.movies
    .filter((m) => !used.has(m.id) && !blocked.has(m.id) && m.backdropPath && m.tagline?.trim())
    .slice(0, SHOWCASE);
  if (showcase.length === 0) throw new Error(`Nenhum filme da fileira "${id}" tem imagem de fundo e tagline`);
  // O deslocamento por fileira evita que todas girem no mesmo ritmo
  const pick = showcase[(day + rowIndex * 3) % showcase.length];
  used.add(pick.id);
  console.log(`${id.padEnd(10)} → ${pick.title} (posição ${row.movies.indexOf(pick) + 1} da fileira, vitrine de ${showcase.length})`);
  return pick;
});

if (process.argv.includes("--dry")) {
  console.log("\nExecução de teste (--dry): nada foi gravado.");
} else {
  fs.writeFileSync(file, JSON.stringify({ ...catalog, hero }));
  console.log(`\nDestaque gravado em public/catalog.json com ${hero.length} filmes.`);
}
