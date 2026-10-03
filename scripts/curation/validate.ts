// Verificações do catálogo gerado: nada é publicado se alguma delas falhar.
import { catalogSchema, CATALOG_ROW_IDS, type Catalog, type CatalogRowId } from "../../src/infrastructure/catalog/catalog-schema.js";
import { getFranchiseKey } from "../../src/infrastructure/api/curation-filters.js";
import { dayIndex } from "./rotation.js";
import { HOME_ROW_ORDER, HOME_ROW_LIMIT, createDeduper } from "../../src/infrastructure/catalog/home-assembly.js";
import { genreCatalogSchema } from "../../src/infrastructure/catalog/genre-catalog.js";
import { GENRES, type GenreCategory } from "../../src/features/catalog/constants.js";

/** Tamanho mínimo de cada fileira (antes de o app tirar o destaque e os repetidos) */
const MIN_SIZE: Record<CatalogRowId, number> = { "em-alta": 25, novidades: 15, aclamados: 30, classicos: 30, populares: 25 };
/** Quantos filmes novos uma fileira estável pode ter, de um dia para o outro, entre as 20 posições que o app mostra */
const VISIBLE = 20;
const MAX_DAILY_CHANGE: Partial<Record<CatalogRowId, number>> = { aclamados: 12, classicos: 12 };
/** Uma fileira nunca mostra dois filmes da mesma franquia */
const MAX_PER_FRANCHISE = 1;

export function validateCatalog(
  raw: unknown,
  previous?: Catalog | null,
  options: { acceptBigChanges?: boolean } = {},
): { errors: string[]; catalog: Catalog | null } {
  const parsed = catalogSchema.safeParse(raw);
  if (!parsed.success) return { errors: [`schema inválido: ${parsed.error.issues[0]?.message ?? "erro"}`], catalog: null };
  const catalog = parsed.data;
  const errors: string[] = [];

  const brasilia = new Date(dayIndex() * 86_400_000);
  const today = brasilia.toISOString().slice(0, 10);

  for (const id of CATALOG_ROW_IDS) {
    const row = catalog.rows.find((r) => r.id === id);
    if (!row) {
      errors.push(`fileira "${id}" ausente`);
      continue;
    }
    const movies = row.movies;
    if (movies.length < MIN_SIZE[id]) errors.push(`${id}: só ${movies.length} filmes (mínimo ${MIN_SIZE[id]})`);

    const ids = movies.map((m) => m.id);
    if (new Set(ids).size !== ids.length) errors.push(`${id}: filme repetido na fileira`);
    for (const m of movies) {
      if (!m.posterPath) errors.push(`${id}: "${m.title}" sem pôster`);
      if (m.releaseDate > today) errors.push(`${id}: "${m.title}" ainda não foi lançado (${m.releaseDate})`);
    }

    if (id === "novidades") {
      // Lançamentos recentes: do ano, completados com os últimos 12 meses só quando falta filme bom
      const oldest = new Date(brasilia.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
      for (const m of movies) if (m.releaseDate < oldest) errors.push(`novidades: "${m.title}" tem mais de 12 meses (${m.releaseDate})`);
    }
    if (id === "classicos") {
      for (const m of movies) if (Number(m.releaseDate.slice(0, 4)) > 1999) errors.push(`classicos: "${m.title}" é de depois de 1999`);
    }
    if (id === "aclamados") {
      for (const m of movies) if (Number(m.releaseDate.slice(0, 4)) < 2000) errors.push(`aclamados: "${m.title}" é de antes de 2000`);
    }

    // Franquias: no máximo um filme por franquia em cada fileira
    const total = new Map<string, number>();
    for (const m of movies) {
      const key = getFranchiseKey(m.title, m.originalTitle);
      total.set(key, (total.get(key) ?? 0) + 1);
    }
    for (const [key, n] of total) if (n > MAX_PER_FRANCHISE) errors.push(`${id}: ${n} filmes da franquia "${key}" (máximo ${MAX_PER_FRANCHISE})`);

    const limit = MAX_DAILY_CHANGE[id];
    const before = previous?.rows.find((r) => r.id === id);
    if (limit !== undefined && before && !options.acceptBigChanges) {
      const old = new Set(before.movies.slice(0, VISIBLE).map((m) => m.id));
      const entered = movies.slice(0, VISIBLE).filter((m) => !old.has(m.id)).length;
      if (entered > limit) errors.push(`${id}: ${entered} filmes novos entre os ${VISIBLE} primeiros de uma vez (limite ${limit}); mudança grande demais`);
    }
  }

  const hero = catalog.hero ?? [];
  if (hero.length !== CATALOG_ROW_IDS.length) errors.push(`destaque com ${hero.length} filmes (esperado ${CATALOG_ROW_IDS.length})`);
  if (new Set(hero.map((m) => m.id)).size !== hero.length) errors.push("destaque com filme repetido");
  for (const m of hero) {
    if (!m.backdropPath) errors.push(`destaque: "${m.title}" sem imagem de fundo`);
    if (!m.tagline?.trim()) errors.push(`destaque: "${m.title}" sem tagline`);
  }

  // Home como o app a monta: sem os filmes do destaque e sem repetir filme entre fileiras
  const dedupe = createDeduper<{ id: number }>(hero.map((m) => m.id));
  for (const id of HOME_ROW_ORDER) {
    const visible = dedupe(catalog.rows.find((r) => r.id === id)?.movies).length;
    if (visible < HOME_ROW_LIMIT) errors.push(`${id}: só ${visible} filmes aparecem na Home (esperado ${HOME_ROW_LIMIT})`);
  }

  return { errors, catalog };
}

/** Nas categorias, as primeiras posições não repetem franquia; depois as sagas voltam, espalhadas */
export const FRANCHISE_UNIQUE_START = 15;

/** Tamanho mínimo de cada categoria (documentário tem menos filmes com público suficiente) */
const MIN_GENRE_SIZE: Partial<Record<GenreCategory, number>> = { "Documentário": 40 };
const DEFAULT_MIN_GENRE_SIZE = 80;

/** Verifica o arquivo de uma categoria curada (public/genres/<slug>.json). */
export function validateGenre(name: GenreCategory, raw: unknown): string[] {
  const parsed = genreCatalogSchema.safeParse(raw);
  if (!parsed.success) return [`${name}: schema inválido (${parsed.error.issues[0]?.message ?? "erro"})`];
  const movies = parsed.data.movies;
  const errors: string[] = [];
  const today = new Date(dayIndex() * 86_400_000).toISOString().slice(0, 10);

  const min = MIN_GENRE_SIZE[name] ?? DEFAULT_MIN_GENRE_SIZE;
  if (movies.length < min) errors.push(`${name}: só ${movies.length} filmes (mínimo ${min})`);
  if (new Set(movies.map((m) => m.id)).size !== movies.length) errors.push(`${name}: filme repetido`);
  for (const m of movies) {
    if (!m.posterPath) errors.push(`${name}: "${m.title}" sem pôster`);
    if (m.releaseDate > today) errors.push(`${name}: "${m.title}" ainda não foi lançado`);
  }
  // A garantia central: todo filme de uma categoria mostra essa categoria na ficha
  for (const m of movies) {
    if (!m.categories?.includes(name)) errors.push(`${name}: "${m.title}" não tem a categoria "${name}" na classificação (${(m.categories ?? []).join(" / ") || "sem categorias"})`);
  }
  const seenStart = new Set<string>();
  for (const m of movies.slice(0, FRANCHISE_UNIQUE_START)) {
    const key = getFranchiseKey(m.title, m.originalTitle);
    if (seenStart.has(key)) errors.push(`${name}: franquia "${key}" repetida entre as ${FRANCHISE_UNIQUE_START} primeiras`);
    seenStart.add(key);
  }
  return errors;
}

/** Todas as categorias; um arquivo ausente é erro. `read` devolve o JSON do arquivo ou null. */
export function validateGenres(read: (name: GenreCategory) => unknown | null): string[] {
  return GENRES.flatMap((name) => {
    const raw = read(name);
    return raw === null ? [`${name}: arquivo ausente`] : validateGenre(name, raw);
  });
}
