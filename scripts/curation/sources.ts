import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CACHE_DIR = path.join(root, "scripts", ".cache");
const OMDB_CACHE_FILE = path.join(CACHE_DIR, "omdb.json");

/** Carrega .env.local para process.env (sem sobrescrever o que já existe). */
export function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "").replace(/\s+#.*$/, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chamada ao TMDB com nova tentativa em 429. */
export async function tmdb<T>(pathWithQuery: string): Promise<T> {
  const token = process.env.TMDB_TOKEN || process.env.VITE_TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB_TOKEN ausente em .env.local");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.themoviedb.org/3${pathWithQuery}`, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (response.status === 429) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`TMDB ${response.status} em ${pathWithQuery}`);
    return (await response.json()) as T;
  }
  throw new Error(`TMDB limitou as chamadas em ${pathWithQuery}`);
}

const TMDB_CACHE_FILE = path.join(CACHE_DIR, "tmdb-details.json");
type TmdbCache = Record<string, { at: number; data: unknown }>;

function readTmdbCache(): TmdbCache {
  try {
    return JSON.parse(fs.readFileSync(TMDB_CACHE_FILE, "utf8")) as TmdbCache;
  } catch {
    return {};
  }
}

const tmdbCache = readTmdbCache();

export function saveTmdbCache() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(TMDB_CACHE_FILE, JSON.stringify(tmdbCache));
}

/** A cada tantas consultas novas o cache é gravado em disco, para uma queda no meio de um build longo não perder tudo. */
const SAVE_EVERY = 200;
let tmdbUnsaved = 0;
let omdbUnsaved = 0;

/** Chamada ao TMDB com cache em disco (padrão: 3 dias), para não refazer centenas de consultas. */
export async function tmdbCached<T>(pathWithQuery: string, ttlMs = 3 * 24 * 3600 * 1000): Promise<T> {
  const hit = tmdbCache[pathWithQuery];
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await tmdb<T>(pathWithQuery);
  tmdbCache[pathWithQuery] = { at: Date.now(), data };
  if (++tmdbUnsaved % SAVE_EVERY === 0) saveTmdbCache();
  return data;
}

export interface AwardsInfo {
  oscarWins: number;
  oscarNominations: number;
  totalWins: number;
  totalNominations: number;
}

export interface OmdbRecord {
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  rottenTomatoes: number | null;
  awards: AwardsInfo;
  /** Gêneros do IMDb (em inglês), na ordem do IMDb */
  genres: string[];
}

export class OmdbLimitError extends Error {}

type OmdbCache = Record<string, OmdbRecord | null>;

function readCache(): OmdbCache {
  try {
    return JSON.parse(fs.readFileSync(OMDB_CACHE_FILE, "utf8")) as OmdbCache;
  } catch {
    return {};
  }
}

const omdbCache = readCache();
/** Teto de chamadas por execução: uma fração da cota diária do plano (100 mil) para sobrar folga. */
const OMDB_RUN_BUDGET = Number(process.env.OMDB_RUN_BUDGET) || 20_000;
let omdbCalls = 0;

export function saveOmdbCache() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(OMDB_CACHE_FILE, JSON.stringify(omdbCache));
}

const toNumber = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/,/g, "").replace("%", "").trim());
  return Number.isFinite(n) && value.trim() !== "N/A" ? n : null;
};

/** Lê o texto de prêmios do OMDb (ex.: "Won 4 Oscars. 312 wins & 271 nominations total"). */
function parseAwards(text: unknown): AwardsInfo {
  const s = typeof text === "string" ? text : "";
  const count = (re: RegExp) => {
    const m = s.match(re);
    return m ? Number(m[1].replace(/,/g, "")) : 0;
  };
  return {
    oscarWins: count(/Won ([\d,]+) Oscars?/i),
    oscarNominations: count(/Nominated for ([\d,]+) Oscars?/i),
    totalWins: count(/([\d,]+) wins?/i),
    totalNominations: count(/([\d,]+) nominations?/i),
  };
}

/** Notas do OMDb por IMDb ID, com cache em disco (inclui "sem dados") para respeitar a cota diária. */
export async function omdbByImdbId(imdbId: string): Promise<OmdbRecord | null> {
  // Registros antigos (sem prêmios ou sem gêneros) são buscados de novo
  if (imdbId in omdbCache && (omdbCache[imdbId] === null || (omdbCache[imdbId]?.awards !== undefined && omdbCache[imdbId]?.genres !== undefined))) {
    return omdbCache[imdbId];
  }

  // Chave exclusiva do script: a do app (VITE_OMDB_API_KEY) nunca é gasta aqui
  const key = process.env.OMDB_SCRIPT_KEY;
  if (!key) throw new Error("OMDB_SCRIPT_KEY ausente em .env.local");
  if (omdbCalls >= OMDB_RUN_BUDGET) throw new OmdbLimitError(`orçamento da execução (${OMDB_RUN_BUDGET}) atingido`);
  omdbCalls++;
  const response = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${key}`);
  if (response.status === 401 || response.status === 429) throw new OmdbLimitError(`OMDb ${response.status}`);
  const json = (await response.json()) as Record<string, unknown> & {
    Ratings?: { Source: string; Value: string }[];
  };
  if (json.Response === "False") {
    if (/limit/i.test(String(json.Error))) throw new OmdbLimitError(String(json.Error));
    omdbCache[imdbId] = null;
    if (++omdbUnsaved % SAVE_EVERY === 0) saveOmdbCache();
    return null;
  }

  const rt = json.Ratings?.find((r) => /rotten/i.test(r.Source))?.Value;
  const record: OmdbRecord = {
    imdbRating: toNumber(json.imdbRating),
    imdbVotes: toNumber(json.imdbVotes),
    metascore: toNumber(json.Metascore),
    rottenTomatoes: toNumber(rt),
    awards: parseAwards(json.Awards),
    genres: typeof json.Genre === "string" && json.Genre !== "N/A" ? json.Genre.split(",").map((g) => g.trim()).filter(Boolean) : [],
  };
  omdbCache[imdbId] = record;
  if (++omdbUnsaved % SAVE_EVERY === 0) saveOmdbCache();
  return record;
}

/** Executa fn sobre os itens com no máximo `limit` chamadas simultâneas. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index], index);
      }
    }),
  );
  return results;
}
