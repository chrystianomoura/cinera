// Curadoria da fileira "Em Alta": o que está em movimento agora, mas só com qualidade comprovada.
// Uso: npm run curate:em-alta            (só mostra o relatório)
//      npm run curate:em-alta -- --write  (grava a fileira em public/catalog.json)
// Ordem = 60% momento (posição nas tendências do dia e da semana) + 40% qualidade (consenso entre fontes).
import { loadEnv, tmdb, mapLimit } from "./curation/sources.js";
import { type Candidate, buildRanking, franchiseOf } from "./curation/scoring.js";
import { writeCatalogRow } from "./curation/pipeline.js";
import { MODERN_CONFIG, fmt, quality, qualityNorm, modernExclusion, showcaseOrder, loadCandidates } from "./curation/modern.js";
import { mapTMDBMovie } from "../src/infrastructure/api/tmdb-mappers.js";
import { filterQualifiedMovies, dedupeFranchises } from "../src/infrastructure/api/curation-filters.js";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../src/infrastructure/api/tmdb-types.js";

loadEnv();

const LIST_SIZE = 30;
const TRENDING_PAGES = 10;

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  console.log("1) Reunindo as tendências do TMDB (dia e semana)...");
  const fetchList = async (kind: "day" | "week") =>
    (
      await mapLimit(Array.from({ length: TRENDING_PAGES }, (_, i) => i + 1), 5, (p) =>
        tmdb<TMDBPaginatedResponse<TMDBMovieRaw>>(`/trending/movie/${kind}?language=pt-BR&page=${p}`),
      )
    ).flatMap((r) => r.results);
  const [dayList, weekList] = await Promise.all([fetchList("day"), fetchList("week")]);
  const momentum = new Map<number, number>();
  const add = (list: TMDBMovieRaw[]) =>
    list.forEach((m, i) => momentum.set(m.id, (momentum.get(m.id) ?? 0) + 0.5 * (1 - i / list.length)));
  add(dayList);
  add(weekList);
  console.log(`   ${momentum.size} filmes em tendência (dia: ${dayList.length}, semana: ${weekList.length})`);

  console.log("2) Detalhes e notas...");
  const { details, candidates } = await loadCandidates([...momentum.keys()]);
  const detailById = new Map(details.map((d) => [d.id, d]));

  const reasons = new Map<number, string>();
  const eligible: Candidate[] = [];
  for (const c of candidates) {
    const reason = modernExclusion(c, detailById.get(c.id)!, today);
    if (reason) reasons.set(c.id, reason);
    else eligible.push(c);
  }
  const score = (c: Candidate) => 0.6 * (momentum.get(c.id) ?? 0) + 0.4 * qualityNorm(c);
  eligible.sort((a, b) => score(b) - score(a));

  const ordered = showcaseOrder(eligible);

  const { picked, skipped } = buildRanking(ordered, MODERN_CONFIG, LIST_SIZE);
  for (const s of skipped) reasons.set(s.candidate.id, s.reason);
  const rank = new Map(picked.map((c, i) => [c.id, i + 1]));

  console.log(`\n=== NOVA LISTA (${picked.length} filmes) — em tendência ${candidates.length}, elegíveis ${eligible.length}`);
  picked.forEach((c, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. ${c.title.slice(0, 38).padEnd(38)} ${c.year}  mom ${fmt(momentum.get(c.id) ?? 0, 2)} qual ${fmt(quality(c), 2)} | TMDB ${fmt(c.tmdbRating)} IMDb ${fmt(c.imdbRating)} (${c.imdbVotes ?? "—"} votos)`,
    ),
  );

  const todayPages = await mapLimit([1, 2], 2, (p) => tmdb<TMDBPaginatedResponse<TMDBMovieRaw>>(`/trending/movie/day?language=pt-BR&page=${p}`));
  const current = dedupeFranchises(filterQualifiedMovies(todayPages.flatMap((p) => p.results).map(mapTMDBMovie), 6.0, 30));
  console.log(`\n=== LISTA ATUAL DO APP (${current.length} filmes) e o que aconteceria com cada filme`);
  current.slice(0, 25).forEach((m, i) => {
    const c = candidates.find((x) => x.id === m.id);
    const status = rank.has(m.id) ? `fica na posição ${rank.get(m.id)}` : `SAI: ${reasons.get(m.id) ?? "fora do corte"}`;
    console.log(`${String(i + 1).padStart(2)}. ${m.title.slice(0, 38).padEnd(38)} TMDB ${fmt(c?.tmdbRating ?? null)} IMDb ${fmt(c?.imdbRating ?? null)} → ${status}`);
  });

  const groups = new Map<string, number[]>();
  picked.forEach((c, i) => groups.set(franchiseOf(c), [...(groups.get(franchiseOf(c)) ?? []), i + 1]));
  const multi = [...groups.entries()].filter(([, l]) => l.length > 1);
  console.log(`\n=== Franquias repetidas: ${multi.length === 0 ? "nenhuma" : multi.map(([k, l]) => `${k} (#${l.join(", #")})`).join("; ")}`);

  if (process.argv.includes("--write")) writeCatalogRow({ id: "em-alta" }, picked, details);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
