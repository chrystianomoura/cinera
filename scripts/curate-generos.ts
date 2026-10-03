// Curadoria das categorias (gêneros) do catálogo.
// Uso: npm run curate:generos                   (as 9 categorias, só relatório)
//      npm run curate:generos -- --write         (grava public/genres/*.json)
//      npm run curate:generos -- Drama --write   (só uma categoria)
import { loadEnv } from "./curation/sources.js";
import { saveTmdbCache } from "./curation/sources.js";
import { curateGenre } from "./curation/genre.js";
import { GENRES, type GenreCategory } from "../src/features/catalog/constants.js";

loadEnv();

const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const names = (requested.length > 0 ? requested : [...GENRES]) as GenreCategory[];
for (const name of names) {
  if (!(GENRES as readonly string[]).includes(name)) {
    console.error(`Categoria desconhecida: "${name}". Opções: ${GENRES.join(", ")}`);
    process.exit(1);
  }
}

const write = process.argv.includes("--write");
for (const name of names) {
  await curateGenre(name, write);
  saveTmdbCache();
}
