// Pipeline de curadoria de uma fileira do catálogo: busca candidatos no TMDB, reúne as notas do
// IMDb/crítica (OMDb), aplica o consenso entre fontes e as regras de franquia, compara com a lista
// que o app mostra hoje e, com --write, grava a fileira em public/catalog.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, tmdb, tmdbCached, saveTmdbCache, omdbByImdbId, saveOmdbCache, mapLimit, OmdbLimitError } from "./sources.js";
import {
  type Candidate,
  type RowConfig,
  buildRanking,
  consensusScore,
  criticsScore,
  prestigeBonus,
  exclusionReason,
  franchiseOf,
} from "./scoring.js";
import { dayIndex, rotateLanes, rotateBlocks } from "./rotation.js";
import { mapTMDBMovie } from "../../src/infrastructure/api/tmdb-mappers.js";
import { filterQualifiedMovies, dedupeFranchises } from "../../src/infrastructure/api/curation-filters.js";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../../src/infrastructure/api/tmdb-types.js";
import type { CatalogRowId } from "../../src/infrastructure/catalog/catalog-schema.js";

loadEnv();

export interface RowDefinition {
  id: CatalogRowId;
  /** Nome mostrado no relatório */
  label: string;
  config: RowConfig;
  listSize: number;
  /** Consulta base do discover (sem sort_by nem page) */
  discoverBase: string;
  /** Páginas por ordenação: nota (vote_average) e popularidade de votos (vote_count) */
  pagesByRating: number;
  pagesByVotes: number;
  /** Só consulta o OMDb de quem tem nota TMDB a partir deste valor (poupa a cota diária) */
  omdbMinTmdbRating?: number;
  /** Filtros que o app usa hoje na fileira ao vivo, para comparar com a lista nova */
  currentQuery: string;
  currentFilters: { minRating: number; minVotes: number };
  /** Exclusão editorial extra (devolve o motivo) */
  editorialExclusion?: (detail: TMDBDetail) => string | null;
  /** Rotação diária: `coreSize` primeiros ficam fixos; o resto gira em faixas, trocando de filme a cada `periodDays` dias */
  rotation?: { coreSize: number; periodDays: number };
  /** Reserva com piso de consenso menor, só para filmes de prestígio forte (Oscar ganho ou crítica ≥ 9) */
  reserve?: { minConsensus: number };
}

export interface TMDBDetail {
  id: number;
  title: string;
  original_title: string;
  vote_average: number;
  vote_count: number;
  imdb_id: string | null;
  belongs_to_collection: { id: number; name: string } | null;
  genres: { id: number; name: string }[];
  origin_country?: string[];
  release_date: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  tagline: string;
}

/** Tamanho dos blocos do núcleo que giram entre si */
const CORE_BLOCK = 5;
const CATALOG_FILE = "public/catalog.json";
const CATALOG_ORDER = ["em-alta", "novidades", "aclamados", "classicos", "populares"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fmt = (n: number | null, digits = 1) => (n === null ? "—" : n.toFixed(digits));

async function collectPool(def: RowDefinition): Promise<Set<number>> {
  const urls: string[] = [];
  for (let p = 1; p <= def.pagesByRating; p++) urls.push(`/discover/movie?${def.discoverBase}&sort_by=vote_average.desc&page=${p}`);
  for (let p = 1; p <= def.pagesByVotes; p++) urls.push(`/discover/movie?${def.discoverBase}&sort_by=vote_count.desc&page=${p}`);

  const pages = await mapLimit(urls, 6, (url) => tmdbCached<TMDBPaginatedResponse<TMDBMovieRaw>>(url));
  const ids = new Set<number>();
  for (const page of pages) for (const m of page.results) if (m.poster_path) ids.add(m.id);
  return ids;
}

/** Lista que o app mostra hoje na fileira (mesma consulta e mesmos filtros do movieService). */
async function currentList(def: RowDefinition) {
  const pages = await mapLimit([1, 2, 3], 3, (p) => tmdb<TMDBPaginatedResponse<TMDBMovieRaw>>(`${def.currentQuery}&page=${p}`));
  const mapped = pages.flatMap((p) => p.results).map(mapTMDBMovie);
  return dedupeFranchises(filterQualifiedMovies(mapped, def.currentFilters.minRating, def.currentFilters.minVotes));
}

/** Grava a fileira em public/catalog.json, preservando as demais fileiras (e o destaque) já existentes. */
export function writeCatalogRow(def: { id: CatalogRowId }, picked: Candidate[], details: TMDBDetail[]) {
  const detailById = new Map(details.map((d) => [d.id, d]));
  const movies = picked.map((c) => {
    const d = detailById.get(c.id)!;
    return {
      id: d.id,
      title: d.title,
      originalTitle: d.original_title,
      overview: d.overview ?? "",
      posterPath: d.poster_path,
      backdropPath: d.backdrop_path,
      voteAverage: Number(d.vote_average.toFixed(1)),
      voteCount: d.vote_count,
      popularity: d.popularity,
      releaseDate: d.release_date,
      tagline: d.tagline || undefined,
      genres: d.genres,
    };
  });

  const file = path.join(root, CATALOG_FILE);
  let existing: { rows?: { id: string; movies: unknown[] }[]; hero?: unknown[] } = {};
  try {
    existing = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* primeiro catálogo */
  }
  const rows = [...(existing.rows ?? []).filter((r) => r.id !== def.id), { id: def.id, movies }].sort(
    (a, b) => CATALOG_ORDER.indexOf(a.id) - CATALOG_ORDER.indexOf(b.id),
  );
  const catalog = { version: 1, generatedAt: new Date().toISOString(), ...(existing.hero ? { hero: existing.hero } : {}), rows };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(catalog));
  console.log(`\nCatálogo gravado em ${CATALOG_FILE}: fileira "${def.id}" com ${movies.length} filmes (${rows.length} fileira(s) no arquivo).`);
}

export async function runRow(def: RowDefinition) {
  console.log(`Fileira: ${def.label}`);
  console.log("1) Reunindo candidatos no TMDB...");
  const ids = await collectPool(def);
  const today = await currentList(def);
  for (const m of today) ids.add(m.id);
  console.log(`   ${ids.size} candidatos (a lista atual do app tem ${today.length} filmes)`);

  console.log("2) Buscando detalhes (coleção e IMDb ID)...");
  const details = await mapLimit([...ids], 8, (id) => tmdbCached<TMDBDetail>(`/movie/${id}?language=pt-BR`));
  saveTmdbCache();

  console.log("3) Buscando notas do IMDb e da crítica (OMDb, com cache em disco)...");
  let omdbStopped = false;
  const omdb = await mapLimit(details, 4, async (d) => {
    if (!d.imdb_id || omdbStopped) return null;
    if (def.omdbMinTmdbRating !== undefined && d.vote_average < def.omdbMinTmdbRating) return null;
    try {
      return await omdbByImdbId(d.imdb_id);
    } catch (error) {
      if (error instanceof OmdbLimitError) {
        omdbStopped = true;
        return null;
      }
      throw error;
    }
  });
  saveOmdbCache();
  if (omdbStopped) console.log("   ATENÇÃO: o limite de consultas do OMDb foi atingido; rode de novo para completar os dados.");

  const candidates: Candidate[] = details.map((d, i) => ({
    id: d.id,
    title: d.title,
    originalTitle: d.original_title,
    year: Number(d.release_date?.slice(0, 4)),
    tmdbRating: d.vote_average,
    tmdbVotes: d.vote_count,
    imdbRating: omdb[i]?.imdbRating ?? null,
    imdbVotes: omdb[i]?.imdbVotes ?? null,
    metascore: omdb[i]?.metascore ?? null,
    rottenTomatoes: omdb[i]?.rottenTomatoes ?? null,
    collectionId: d.belongs_to_collection?.id ?? null,
    collectionName: d.belongs_to_collection?.name ?? null,
    genres: d.genres.map((g) => g.name),
    awards: omdb[i]?.awards ?? null,
  }));
  const detailById = new Map(details.map((d) => [d.id, d]));

  // Qualidade: quem não passa nos critérios sai com o motivo registrado
  const reasons = new Map<number, string>();
  const eligible: Candidate[] = [];
  for (const c of candidates) {
    const reason = def.editorialExclusion?.(detailById.get(c.id)!) ?? exclusionReason(c, def.config);
    if (reason) reasons.set(c.id, reason);
    else eligible.push(c);
  }
  const rankScore = (c: Candidate) => consensusScore(c) + prestigeBonus(c);
  eligible.sort((a, b) => rankScore(b) - rankScore(a));

  // Reserva: consenso um pouco abaixo do piso, mas só com prestígio forte. Fica depois de toda a fila principal
  const strongPrestige = (c: Candidate) => (c.awards?.oscarWins ?? 0) >= 1 || (criticsScore(c) ?? 0) >= 9.0;
  const eligibleIds = new Set(eligible.map((c) => c.id));
  const reserve = def.reserve
    ? candidates
        .filter(
          (c) =>
            !eligibleIds.has(c.id) &&
            !def.editorialExclusion?.(detailById.get(c.id)!) &&
            strongPrestige(c) &&
            exclusionReason(c, { ...def.config, minConsensus: def.reserve!.minConsensus, requirePrestige: false }) === null,
        )
        .sort((a, b) => rankScore(b) - rankScore(a))
    : [];
  const queue = [...eligible, ...reserve];

  let picked: Candidate[];
  let skipped: ReturnType<typeof buildRanking>["skipped"];
  if (def.rotation) {
    const { coreSize, periodDays } = def.rotation;
    const ranked = buildRanking(queue, def.config, queue.length).picked;
    const core = ranked.slice(0, coreSize);
    const rest = ranked.slice(coreSize);
    const window = rotateLanes(rest, def.listSize - coreSize, periodDays, dayIndex(), (c) => c.id);
    const inWindow = new Set(window.map((c) => c.id));
    // Ordem de entrada: núcleo, janela do dia e, só como reposição de franquia repetida, o resto da fila
    const result = buildRanking([...core, ...window, ...rest.filter((c) => !inWindow.has(c.id))], def.config, def.listSize);
    // O núcleo troca de posição todo dia, em blocos do mesmo nível (os 5 melhores entre si, depois os 5 seguintes)
    picked = [...rotateBlocks(result.picked.slice(0, coreSize), CORE_BLOCK, dayIndex()), ...result.picked.slice(coreSize)];
    skipped = result.skipped;
    console.log(`   Rotação: núcleo de ${core.length}, ${window.length} faixas rodando entre ${rest.length} filmes da fila (dia ${dayIndex()})`);
  } else {
    ({ picked, skipped } = buildRanking(queue, def.config, def.listSize));
  }
  for (const s of skipped) reasons.set(s.candidate.id, s.reason);
  const rank = new Map(picked.map((c, i) => [c.id, i + 1]));

  const line = (c: Candidate, position: number) =>
    `${String(position).padStart(2)}. ${c.title.slice(0, 36).padEnd(36)} ${String(c.year)}  pont ${fmt(rankScore(c), 2)} | IMDb ${fmt(c.imdbRating)} crít ${fmt(criticsScore(c))} | Oscar ${c.awards?.oscarWins ? "ganhou " + c.awards.oscarWins : c.awards?.oscarNominations ? "indic. " + c.awards.oscarNominations : "—"} | ${c.awards?.totalWins ?? 0} prêmios`;

  console.log(`\n=== NOVA LISTA (${picked.length} filmes) — pool ${candidates.length}, elegíveis ${eligible.length}`);
  picked.forEach((c, i) => console.log(line(c, i + 1)));

  const byId = new Map(candidates.map((c) => [c.id, c]));
  console.log(`\n=== LISTA ATUAL DO APP (primeiros 30) e o que aconteceria com cada filme`);
  today.slice(0, 30).forEach((m, i) => {
    const c = byId.get(m.id)!;
    const status = rank.has(c.id) ? `fica na posição ${rank.get(c.id)}` : `SAI: ${reasons.get(c.id) ?? "fora do corte"}`;
    console.log(
      `${String(i + 1).padStart(2)}. ${c.title.slice(0, 38).padEnd(38)} ${c.year}  TMDB ${fmt(c.tmdbRating)} IMDb ${fmt(c.imdbRating)}  → ${status}`,
    );
  });

  const stats = new Map<string, number>();
  for (const reason of reasons.values()) {
    const key = reason.replace(/\(.*\)/, "").replace(/: TMDB.*$/, "").trim();
    stats.set(key, (stats.get(key) ?? 0) + 1);
  }
  console.log(`\n=== Motivos de exclusão no pool de ${candidates.length}:`, JSON.stringify(Object.fromEntries(stats)));

  const groups = new Map<string, Candidate[]>();
  for (const c of picked) groups.set(franchiseOf(c), [...(groups.get(franchiseOf(c)) ?? []), c]);
  const multi = [...groups.entries()].filter(([, list]) => list.length > 1);
  console.log(
    `=== Franquias com mais de um filme na lista: ${
      multi.length === 0 ? "nenhuma" : multi.map(([k, l]) => `${k} (${l.map((c) => `#${rank.get(c.id)}`).join(", ")})`).join("; ")
    }`,
  );

  if (process.argv.includes("--write")) writeCatalogRow(def, picked, details);

  fs.mkdirSync(path.join(root, "scripts", ".cache"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "scripts", ".cache", `${def.id}-prototype.json`),
    JSON.stringify({ config: def.config, picked, queue: queue.filter((c) => !rank.has(c.id)), reasons: Object.fromEntries(reasons) }, null, 1),
  );
}
