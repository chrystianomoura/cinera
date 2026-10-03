// Curadoria de uma categoria (gênero): os filmes de maior peso do gênero primeiro, com o nível caindo
// devagar, um filme por franquia, e a ordem girando um pouco todo dia. Grava public/genres/<slug>.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmdbCached, mapLimit } from "./sources.js";
import { type Candidate, type RowConfig, buildRanking, consensusScore, prestigeBonus } from "./scoring.js";
import { dayIndex, rotateBlocks } from "./rotation.js";
import { loadCandidates, fmt } from "./modern.js";
import type { TMDBDetail } from "./pipeline.js";
import { GENRE_SLUGS, type GenreCategory } from "../../src/features/catalog/constants.js";
import { classifyMovie } from "../../src/domain/classification.js";
import { FRANCHISE_UNIQUE_START } from "./validate.js";
import type { TMDBMovieRaw, TMDBPaginatedResponse } from "../../src/infrastructure/api/tmdb-types.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIST_SIZE = 200;
const PAGES_BY_VOTES = 50;
const PAGES_BY_RATING = 30;
/** Piso geral de qualidade (consenso) para qualquer categoria */
const MIN_CONSENSUS = 6.8;
/** Quanto a popularidade (votos no IMDb) pode somar à pontuação, e a escala em que ela é medida */
const POPULARITY_WEIGHT = 1.4;
const POPULARITY_FLOOR_LOG = Math.log10(25_000);
const POPULARITY_CEIL_LOG = Math.log10(3_000_000);
/** Bônus de pontos para o filme que tem a categoria como primeira etiqueta */
const FIRST_LABEL_BONUS = 0.5;
/** Divergência máxima entre TMDB e IMDb (acima disso, nota inflada) */
const MAX_DIVERGENCE = 1.0;
/**
 * Gêneros do TMDB que alimentam o conjunto de candidatos de cada categoria. É só um funil largo: quem
 * decide se o filme pertence mesmo à categoria é a classificação única (classifyMovie), a mesma da ficha.
 */
const POOL_GENRES: Record<GenreCategory, string> = {
  "Ação & Aventura": "28|12|37",
  "Animação": "16",
  "Comédia": "35",
  "Documentário": "99",
  "Drama": "18|10752|36|10402",
  "Ficção & Fantasia": "878|14",
  "Romance": "10749",
  "Suspense & Crime": "53|80|9648",
  "Terror": "27",
};
/** Público mínimo no IMDb por categoria (documentário tem menos votos) */
const MIN_IMDB_VOTES: Partial<Record<GenreCategory, number>> = { "Documentário": 8_000 };
const DEFAULT_MIN_IMDB_VOTES = 25_000;
/** Votos mínimos no TMDB para entrar no conjunto de candidatos (documentário tem menos votantes) */
const POOL_MIN_TMDB_VOTES: Partial<Record<GenreCategory, number>> = { "Documentário": 100 };
const DEFAULT_POOL_MIN_TMDB_VOTES = 500;

const CONFIG: RowConfig = {
  minImdbVotes: DEFAULT_MIN_IMDB_VOTES,
  maxDivergence: MAX_DIVERGENCE,
  minConsensus: MIN_CONSENSUS,
  requirePrestige: false,
  // Categoria é uma lista longa de um gênero: só o começo (15 primeiros) tem 1 filme por franquia, para abrir variada.
  // Depois as sagas voltam sem limite, espalhadas com pelo menos 10 posições entre filmes da mesma franquia.
  strictFranchiseBlock: FRANCHISE_UNIQUE_START,
  franchiseSpacing: 10,
  maxPerFranchise: Number.POSITIVE_INFINITY,
};

export interface GenreResult {
  name: GenreCategory;
  picked: Candidate[];
  eligible: number;
  pool: number;
}

/** Candidatos: os mais votados e os mais bem avaliados dos gêneros da categoria. */
async function collectPool(name: GenreCategory): Promise<number[]> {
  const filters = `with_genres=${POOL_GENRES[name]}&language=pt-BR`;
  const urls = [
    ...Array.from({ length: PAGES_BY_VOTES }, (_, i) => `/discover/movie?${filters}&vote_count.gte=${POOL_MIN_TMDB_VOTES[name] ?? DEFAULT_POOL_MIN_TMDB_VOTES}&sort_by=vote_count.desc&page=${i + 1}`),
    ...Array.from({ length: PAGES_BY_RATING }, (_, i) => `/discover/movie?${filters}&vote_count.gte=${Math.max(300, (POOL_MIN_TMDB_VOTES[name] ?? DEFAULT_POOL_MIN_TMDB_VOTES) * 2)}&sort_by=vote_average.desc&page=${i + 1}`),
  ];
  const pages = await mapLimit(urls, 6, (url) => tmdbCached<TMDBPaginatedResponse<TMDBMovieRaw>>(url));
  const ids = new Set<number>();
  for (const page of pages) for (const m of page.results ?? []) if (m.poster_path) ids.add(m.id);
  return [...ids];
}

export async function curateGenre(name: GenreCategory, write: boolean): Promise<GenreResult> {
  const today = new Date().toISOString().slice(0, 10);

  console.log(`\n=== ${name} ===`);
  console.log("1) Candidatos no TMDB...");
  const ids = await collectPool(name);
  console.log(`   ${ids.length} candidatos`);

  console.log("2) Detalhes e notas...");
  const { details, candidates } = await loadCandidates(ids);
  const detailById = new Map<number, TMDBDetail>(details.map((d) => [d.id, d]));
  const minVotes = MIN_IMDB_VOTES[name] ?? DEFAULT_MIN_IMDB_VOTES;

  // Pertencimento: a categoria precisa estar entre as do filme na classificação única (a mesma da ficha)
  const categoriesOf = (c: Candidate) =>
    classifyMovie({ tmdbGenres: detailById.get(c.id)!.genres.map((g) => g.name), imdbGenres: c.imdbGenres });

  const eligible = candidates.filter((c) => {
    const d = detailById.get(c.id)!;
    if (!d.poster_path || !d.release_date || d.release_date > today) return false;
    if (c.imdbRating === null || (c.imdbVotes ?? 0) < minVotes) return false;
    if (Math.abs(c.tmdbRating - c.imdbRating) > MAX_DIVERGENCE) return false;
    if (consensusScore(c) < MIN_CONSENSUS) return false;
    return categoriesOf(c).includes(name);
  });

  // O prestígio pesa metade do que pesa em Aclamados: terror e comédia raramente ganham Oscar
  // Quem tem a categoria como PRIMEIRA etiqueta ("Comédia / Romance") ganha um bônus fixo sobre quem a tem como
  // segunda ("Drama / Comédia"): sobe bastante, mas um filme muito melhor na segunda etiqueta ainda pode ficar à
  // frente, e a nota continua descendo de forma contínua. Formatos (Animação e Documentário) têm uma etiqueta só.
  const FORMATS: GenreCategory[] = ["Animação", "Documentário"];
  const firstLabelBonus = (c: Candidate) => (!FORMATS.includes(name) && categoriesOf(c)[0] === name ? FIRST_LABEL_BONUS : 0);
  // Popularidade: os votos no IMDb (escala logarítmica) valem até +1,0 ponto, de 25 mil votos (0) a ~3 milhões (1).
  // Filmes conhecidos vêm à frente de filmes parecidos em nota, e a popularidade desce junto com a nota.
  const popularity = (c: Candidate) => Math.min(1, Math.max(0, (Math.log10(c.imdbVotes ?? 1) - POPULARITY_FLOOR_LOG) / (POPULARITY_CEIL_LOG - POPULARITY_FLOOR_LOG)));
  const score = (c: Candidate) => consensusScore(c) + 0.5 * prestigeBonus(c) + firstLabelBonus(c) + POPULARITY_WEIGHT * popularity(c);
  eligible.sort((a, b) => score(b) - score(a));


  const ranking = buildRanking(eligible, { ...CONFIG, minImdbVotes: minVotes }, LIST_SIZE);
  const ranked = ranking.picked;

  // Giro diário que preserva o nível: os 15 primeiros alternam em blocos de 5 (sem cruzar o limite onde as sagas
  // voltam a poder repetir); depois blocos maiores
  const day = dayIndex();
  const picked = [
    ...rotateBlocks(ranked.slice(0, FRANCHISE_UNIQUE_START), 5, day),
    ...rotateBlocks(ranked.slice(FRANCHISE_UNIQUE_START, 45), 6, day),
    ...rotateBlocks(ranked.slice(45), 10, day),
  ];

  console.log(`3) ${picked.length} filmes (elegíveis ${eligible.length} de ${candidates.length})`);
  picked.slice(0, 15).forEach((c, i) =>
    console.log(`   ${String(i + 1).padStart(2)}. ${c.title.slice(0, 38).padEnd(38)} ${c.year}  consenso ${fmt(consensusScore(c), 2)} | IMDb ${fmt(c.imdbRating)} (${c.imdbVotes ?? "—"} votos)`),
  );
  const at = (i: number) => (picked[i] ? `${fmt(consensusScore(picked[i]), 2)}` : "—");
  console.log(`   Consenso nas posições 1, 10, 25, 50, 100, 150, 200: ${[0, 9, 24, 49, 99, 149, 199].map(at).join(" / ")}`);

  if (write) {
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
        categories: categoriesOf(c),
      };
    });
    const file = path.join(root, "public", "genres", `${GENRE_SLUGS[name]}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), genre: name, movies }));
    console.log(`   Gravado em public/genres/${GENRE_SLUGS[name]}.json`);
  }

  return { name, picked, eligible: eligible.length, pool: candidates.length };
}
