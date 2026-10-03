// Verificações do catálogo gerado: nada é publicado se alguma delas falhar.
import { catalogSchema, CATALOG_ROW_IDS, type Catalog, type CatalogRowId } from "../../src/infrastructure/catalog/catalog-schema.js";
import { getFranchiseKey } from "../../src/infrastructure/api/curation-filters.js";
import { dayIndex } from "./rotation.js";
import { HOME_ROW_ORDER, HOME_ROW_LIMIT, createDeduper } from "../../src/infrastructure/catalog/home-assembly.js";

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
