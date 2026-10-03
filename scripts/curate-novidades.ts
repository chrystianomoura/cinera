// Curadoria da fileira "Novidades": lançamentos do ano corrente já em cartaz, com qualidade comprovada.
// Se faltarem filmes bons do ano para encher a fileira, completa com os melhores dos últimos 12 meses
// (as mesmas regras de qualidade, sempre depois dos do ano).
// Uso: npm run curate:novidades            (só mostra o relatório)
//      npm run curate:novidades -- --write  (grava a fileira em public/catalog.json)
// Ordem = 40% qualidade (consenso entre fontes) + 30% recência (meia-vida de ~90 dias) + 30% popularidade.
// Só entra filme que o público conhece: piso de votos no IMDb (com exceção para lançamentos muito recentes).
import { loadEnv, tmdb, mapLimit } from "./curation/sources.js";
import { type Candidate, buildRanking, franchiseOf } from "./curation/scoring.js";
import { writeCatalogRow } from "./curation/pipeline.js";
import { MODERN_CONFIG, fmt, quality, qualityNorm, modernExclusion, unknownReason, showcaseOrder, loadCandidates } from "./curation/modern.js";
import { mapTMDBMovie } from "../src/infrastructure/api/tmdb-mappers.js";
import { filterQualifiedMovies, dedupeFranchises } from "../src/infrastructure/api/curation-filters.js";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../src/infrastructure/api/tmdb-types.js";

loadEnv();

const LIST_SIZE = 40;
const POPULARITY_PAGES = 15;
const RATING_PAGES = 10;
/** Filmes do ano que a fileira quer ter antes de recorrer aos meses anteriores */
const MIN_THIS_YEAR = 32;
const LOOKBACK_DAYS = 365;
const RECENCY_HALF_LIFE_DAYS = 90;
const DAY_MS = 86_400_000;

async function main() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString().slice(0, 10);
  const base = `language=pt-BR&primary_release_date.gte=${since}&primary_release_date.lte=${today}&region=BR`;

  console.log(`1) Reunindo lançamentos dos últimos 12 meses no TMDB (popularidade e nota)...`);
  const urls = [
    ...Array.from({ length: POPULARITY_PAGES }, (_, i) => `/discover/movie?${base}&sort_by=popularity.desc&vote_count.gte=100&page=${i + 1}`),
    ...Array.from({ length: RATING_PAGES }, (_, i) => `/discover/movie?${base}&sort_by=vote_average.desc&vote_count.gte=300&page=${i + 1}`),
  ];
  const pages = await mapLimit(urls, 6, (url) => tmdb<TMDBPaginatedResponse<TMDBMovieRaw>>(url));
  const ids = new Set<number>();
  for (const page of pages) for (const m of page.results) ids.add(m.id);
  // Popularidade: posição na lista por popularidade (as primeiras páginas da busca)
  const byPopularity = pages.slice(0, POPULARITY_PAGES).flatMap((page) => page.results);
  const popularity = new Map<number, number>();
  byPopularity.forEach((m, i) => {
    if (!popularity.has(m.id)) popularity.set(m.id, 1 - i / byPopularity.length);
  });
  console.log(`   ${ids.size} lançamentos candidatos`);

  console.log("2) Detalhes e notas...");
  const { details, candidates } = await loadCandidates([...ids]);
  const detailById = new Map(details.map((d) => [d.id, d]));

  const recency = (c: Candidate) => {
    const days = Math.max(0, (now.getTime() - new Date(detailById.get(c.id)!.release_date).getTime()) / DAY_MS);
    return Math.pow(0.5, days / RECENCY_HALF_LIFE_DAYS);
  };

  const ageDays = (c: Candidate) => (now.getTime() - new Date(detailById.get(c.id)!.release_date).getTime()) / DAY_MS;

  const reasons = new Map<number, string>();
  const eligible: Candidate[] = [];
  for (const c of candidates) {
    // A busca com region=BR usa a data de lançamento no Brasil, então reexibições de filmes antigos (como a de um
    // filme de terror perto do Halloween) entram no conjunto: novidade é pela data de lançamento original
    const reason =
      modernExclusion(c, detailById.get(c.id)!, today) ??
      (ageDays(c) > LOOKBACK_DAYS ? "reexibição de filme antigo, lançado há mais de 12 meses" : null) ??
      unknownReason(c, ageDays(c));
    if (reason) reasons.set(c.id, reason);
    else eligible.push(c);
  }
  const score = (c: Candidate) => 0.4 * qualityNorm(c) + 0.3 * recency(c) + 0.3 * (popularity.get(c.id) ?? 0);
  eligible.sort((a, b) => score(b) - score(a));

  // Os do ano vêm primeiro; os dos meses anteriores só completam quando faltam filmes do ano
  const thisYear = eligible.filter((c) => c.year === year);
  const earlier = eligible.filter((c) => c.year !== year);
  const ordered = [...showcaseOrder(thisYear), ...(thisYear.length < MIN_THIS_YEAR ? earlier : [])];
  console.log(`   Elegíveis: ${thisYear.length} de ${year}${thisYear.length < MIN_THIS_YEAR ? `, completando com ${earlier.length} dos meses anteriores` : ""}`);

  const { picked, skipped } = buildRanking(ordered, MODERN_CONFIG, LIST_SIZE);
  for (const s of skipped) reasons.set(s.candidate.id, s.reason);
  const rank = new Map(picked.map((c, i) => [c.id, i + 1]));

  console.log(`\n=== NOVA LISTA (${picked.length} filmes) — candidatos ${candidates.length}, elegíveis ${eligible.length}`);
  picked.forEach((c, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. ${c.title.slice(0, 38).padEnd(38)} ${detailById.get(c.id)!.release_date}  pop ${fmt(popularity.get(c.id) ?? 0, 2)} rec ${fmt(recency(c), 2)} qual ${fmt(quality(c), 2)} | TMDB ${fmt(c.tmdbRating)} IMDb ${fmt(c.imdbRating)} (${c.imdbVotes ?? "—"} votos)`,
    ),
  );

  const todayPages = await mapLimit([1, 2, 3], 3, (p) =>
    tmdb<TMDBPaginatedResponse<TMDBMovieRaw>>(
      `/discover/movie?language=pt-BR&sort_by=popularity.desc&primary_release_date.gte=${year}-01-01&vote_count.gte=30&vote_average.gte=6.0&page=${p}`,
    ),
  );
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

  if (process.argv.includes("--write")) writeCatalogRow({ id: "novidades" }, picked, details);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
