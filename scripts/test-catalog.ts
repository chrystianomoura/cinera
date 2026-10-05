// Verifica o catálogo publicado (public/catalog.json) e a lógica de rotação.
// Uso: npm run test:catalog
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalog, validateGenres } from "./curation/validate.js";
import { GENRE_SLUGS } from "../src/features/catalog/constants.js";
import { rotateLanes, rotateBlocks, rotateTop } from "./curation/rotation.js";
import { pickHero } from "./curation/hero.js";
import { runFixtures } from "./curation/classification-fixtures.js";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "OK   " : "FALHA"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

// --- Rotação em faixas
const items = Array.from({ length: 200 }, (_, i) => i);
const SIZE = 30;
const PERIOD = 4;
const rot = (list: number[], day: number) => rotateLanes(list, SIZE, PERIOD, day, (v) => v);
const a = rot(items, 20_000);
check("rotação: devolve o tamanho pedido", a.length === SIZE);
check("rotação: mesmo dia, mesmo resultado", JSON.stringify(a) === JSON.stringify(rot(items, 20_000)));
check("rotação: lista fica em ordem de qualidade (índices crescentes)", a.every((v, i) => i === 0 || v > a[i - 1]));
let maxChange = 0;
let lanesOk = true;
const laneSize = Math.floor(items.length / SIZE);
for (let day = 20_000; day < 20_200; day++) {
  const today = rot(items, day);
  const next = rot(items, day + 1);
  maxChange = Math.max(maxChange, next.filter((v, i) => v !== today[i]).length);
  today.forEach((v, lane) => {
    if (lane < SIZE - 1 && (v < lane * laneSize || v >= (lane + 1) * laneSize)) lanesOk = false;
  });
}
check(`rotação: no máximo ${Math.ceil(SIZE / PERIOD)} posições mudam por dia (medido ${maxChange})`, maxChange <= Math.ceil(SIZE / PERIOD));
check("rotação: cada posição sempre sai da sua faixa de qualidade", lanesOk);
const lane0 = Array.from({ length: 60 }, (_, t) => rot(items, 20_000 + t * PERIOD)[0]);
check("rotação: a mesma faixa não repete o filme em turnos seguidos", lane0.every((v, i) => i === 0 || v !== lane0[i - 1]));
check("rotação: a faixa passa por todos os seus filmes ao longo do tempo", new Set(Array.from({ length: 80 }, (_, t) => rot(items, 20_000 + t * PERIOD)[0])).size === laneSize);
// Estabilidade: tirar um filme da fila altera só parte das posições (por índice, quase todas mudariam)
let worst = 0;
for (let day = 20_000; day < 20_030; day++) {
  for (const removed of [3, 40, 90, 150]) {
    const reduced = items.filter((v) => v !== removed);
    worst = Math.max(worst, rot(items, day).filter((v, i) => v !== rot(reduced, day)[i]).length);
  }
}
check(`rotação: tirar um filme da fila altera no máximo 18 de ${SIZE} posições (medido ${worst})`, worst <= 18);
check("rotação: lista menor que a janela volta inteira", rotateLanes([1, 2, 3], SIZE, PERIOD, 5, (v) => v).length === 3);

// --- Classificação única (painel de filmes de referência)
for (const r of runFixtures()) {
  if (r.known) console.log(`NOTA  classificação: ${r.title} é uma limitação conhecida (${r.categories.join(", ")}${r.ok ? "" : `; ${r.problem}`})`);
  else check(`classificação: ${r.title} → ${r.categories.join(" / ")}`, r.ok, r.problem);
}

// --- Giro do núcleo em blocos
const core = Array.from({ length: 10 }, (_, i) => i);
const blockOk = Array.from({ length: 30 }, (_, day) => rotateBlocks(core, 5, 20_000 + day)).every(
  (r) => [...r.slice(0, 5)].sort().join() === "0,1,2,3,4" && [...r.slice(5)].sort().join() === "5,6,7,8,9",
);
check("giro do núcleo: cada bloco de 5 mantém os mesmos filmes", blockOk);
const firsts = new Set(Array.from({ length: 5 }, (_, day) => rotateBlocks(core, 5, 20_000 + day)[0]));
check("giro do núcleo: os 5 primeiros revezam na abertura em 5 dias", firsts.size === 5);
check("giro do núcleo: o filme 10 nunca abre a fileira", Array.from({ length: 50 }, (_, day) => rotateBlocks(core, 5, day)[0]).every((v) => v < 5));
check(
  "giro do núcleo: uma posição por dia e volta ao início em 5 dias",
  JSON.stringify(rotateBlocks(core, 5, 20_000)) === JSON.stringify(rotateBlocks(core, 5, 20_005)) &&
    rotateBlocks(core, 5, 1)[0] === 1,
);
check("giro do núcleo: lista menor que o bloco não quebra", rotateBlocks([1, 2], 5, 3).length === 2 && rotateBlocks([], 5, 3).length === 0);

// --- Topo das fileiras
const row50 = Array.from({ length: 50 }, (_, i) => i);
const topDays = Array.from({ length: 20 }, (_, d) => rotateTop(row50, 20_000 + d));
check("topo da fileira: os 10 primeiros mantêm os mesmos filmes, só em outra ordem", topDays.every((r) => [...r.slice(0, 10)].sort((x, y) => x - y).join() === "0,1,2,3,4,5,6,7,8,9"));
check("topo da fileira: o resto da fileira não muda", topDays.every((r) => r.slice(10).join() === row50.slice(10).join()));
check("topo da fileira: quem abre a fileira muda todo dia", topDays.every((r, i) => i === 0 || r[0] !== topDays[i - 1][0]));

// --- Destaque: os 5 mudam todo dia
const ROW_IDS = ["em-alta", "novidades", "aclamados", "classicos", "populares"] as const;
const heroRows = ROW_IDS.map((id, r) => ({
  id,
  movies: Array.from({ length: 20 }, (_, i) => ({ id: r * 100 + i, title: `${id} ${i}`, backdropPath: "/x.jpg", tagline: "t" })),
}));
let heroOk = true;
let heroDup = false;
let previousHero: { id: number }[] = [];
for (let day = 20_000; day < 20_100; day++) {
  // as fileiras também giram: o topo muda de lugar a cada dia
  const rows = heroRows.map((r) => ({ ...r, movies: rotateTop(r.movies, day) }));
  const hero = pickHero(rows, {}, day, previousHero);
  if (hero.some((m) => previousHero.some((p) => p.id === m.id))) heroOk = false;
  if (new Set(hero.map((m) => m.id)).size !== hero.length) heroDup = true;
  previousHero = hero;
}
check("destaque: nenhum dos 5 repete o do dia anterior (100 dias seguidos)", heroOk);
check("destaque: nunca repete filme no mesmo dia", !heroDup);
check("destaque: ignora filme sem imagem de fundo ou sem tagline", (() => {
  const rows = [{ id: "em-alta" as const, movies: [{ id: 1, title: "a", backdropPath: null, tagline: "t" }, { id: 2, title: "b", backdropPath: "/x", tagline: " " }, { id: 3, title: "c", backdropPath: "/x", tagline: "t" }] }];
  return pickHero(rows, {}, 7)[0].id === 3;
})());

// --- Catálogo publicado
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "catalog.json");
const { errors } = validateCatalog(JSON.parse(fs.readFileSync(file, "utf8")));
check(`catálogo publicado: ${errors.length === 0 ? "todas as verificações passam" : `${errors.length} problema(s)`}`, errors.length === 0);
for (const e of errors) console.log(`        - ${e}`);

const genreErrors = validateGenres((name) => {
  const genreFile = path.resolve(path.dirname(file), "genres", `${GENRE_SLUGS[name]}.json`);
  return fs.existsSync(genreFile) ? JSON.parse(fs.readFileSync(genreFile, "utf8")) : null;
});
check(`categorias publicadas: ${genreErrors.length === 0 ? "todas as verificações passam" : `${genreErrors.length} problema(s)`}`, genreErrors.length === 0);
for (const e of genreErrors) console.log(`        - ${e}`);

// --- Índice de categorias (usado pela pesquisa e pela ficha)
const indexFile = path.resolve(path.dirname(file), "categories.json");
const index = fs.existsSync(indexFile) ? (JSON.parse(fs.readFileSync(indexFile, "utf8")) as { categories: Record<string, string[]> }).categories : null;
check("índice de categorias existe", index !== null);
if (index) {
  let mismatch = 0;
  let total = 0;
  for (const name of Object.keys(GENRE_SLUGS)) {
    const genreFile = path.resolve(path.dirname(file), "genres", `${GENRE_SLUGS[name as keyof typeof GENRE_SLUGS]}.json`);
    if (!fs.existsSync(genreFile)) continue;
    for (const m of (JSON.parse(fs.readFileSync(genreFile, "utf8")) as { movies: { id: number; categories: string[] }[] }).movies) {
      total++;
      if ((index[String(m.id)] ?? []).join() !== m.categories.join()) mismatch++;
    }
  }
  check(`índice de categorias bate com as listas (${total} filmes conferidos)`, mismatch === 0, `${mismatch} divergências`);
}

// --- Notas do IMDb publicadas (a ficha lê daqui, sem consultar o OMDb ao vivo)
const imdbFile = path.resolve(path.dirname(file), "imdb.json");
const imdb = fs.existsSync(imdbFile) ? (JSON.parse(fs.readFileSync(imdbFile, "utf8")) as { ratings: Record<string, [number, number | null]> }).ratings : null;
check("notas do IMDb existem", imdb !== null);
if (imdb && index) {
  const entries = Object.entries(imdb);
  const valid = entries.every(([id, [rating, votes]]) => /^tt\d+$/.test(id) && rating >= 1 && rating <= 10 && (votes === null || votes >= 0));
  check(`notas do IMDb: formato válido (${entries.length} filmes)`, valid);
  check("notas do IMDb: cobrem quase todo o catálogo", entries.length >= Object.keys(index).length * 0.98, `${entries.length} notas para ${Object.keys(index).length} filmes`);
}

if (failed > 0) {
  console.log(`\n${failed} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\nTudo certo.");
