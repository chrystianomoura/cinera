import type { CatalogRowId } from "./catalog-schema";

/** Fileiras da Home na ordem de exibição (a primeira que pega um filme fica com ele, salvo se outra fileira ficar sem filmes suficientes). */
export const HOME_ROW_ORDER: readonly CatalogRowId[] = ["novidades", "em-alta", "aclamados", "classicos", "populares"];

/** Quantos filmes cada fileira mostra na Home. */
export const HOME_ROW_LIMIT = 20;

export interface HomeRowInput<T> {
  id: string;
  /** Os filmes da fileira, na ordem da curadoria (a lista inteira, não só os que cabem na Home) */
  movies?: T[];
}

/**
 * Distribui os filmes entre as fileiras da Home: nenhum filme aparece em duas fileiras (nem no destaque) e cada fileira mostra até
 * `limit` filmes, na ordem da curadoria.
 *
 * Começa como sempre foi: cada fileira, na ordem, pega os primeiros filmes ainda livres. Isso basta quando as fileiras têm filmes
 * diferentes. Mas Novidades e Em Alta dividem os mesmos lançamentos de qualidade: quem vem primeiro levava os 20 melhores e a outra
 * ficava só com o que sobrava (17 a 19), mesmo havendo filmes de sobra no conjunto das duas. Por isso, uma fileira que ficou com menos
 * de `limit` filmes passa a buscar os que faltam: primeiro os que ninguém pegou; depois, os de outra fileira que tem reposição na própria
 * lista (começando pelo que a outra fileira menos valoriza, o de pior posição na lista dela). Encadeia, se preciso (A tira de B, que
 * tira de C). Usado pela Home e pela verificação do catálogo, para as duas concordarem sobre o que aparece.
 *
 * Só falta filme em uma fileira se o conjunto das listas não tem filmes distintos suficientes.
 */
export function assignHomeRows<T extends { id: number }>(
  rows: readonly HomeRowInput<T>[],
  excludedIds: Iterable<number> = [],
  limit: number = HOME_ROW_LIMIT,
): Record<string, T[]> {
  const excluded = new Set(excludedIds);

  // A lista candidata de cada fileira: sem os excluídos (destaque) e sem filme repetido dentro dela
  const lists = new Map<string, T[]>();
  const rankIn = new Map<string, Map<number, number>>(); // posição de cada filme na lista da fileira
  for (const row of rows) {
    const seen = new Set<number>();
    const list: T[] = [];
    for (const movie of row.movies ?? []) {
      if (excluded.has(movie.id) || seen.has(movie.id)) continue;
      seen.add(movie.id);
      list.push(movie);
    }
    lists.set(row.id, list);
    rankIn.set(row.id, new Map(list.map((movie, index) => [movie.id, index])));
  }

  const ownerOf = new Map<number, string>();
  const owned = new Map<string, Set<number>>(rows.map((row) => [row.id, new Set<number>()]));
  const give = (rowId: string, movieId: number) => {
    ownerOf.set(movieId, rowId);
    owned.get(rowId)!.add(movieId);
  };
  const take = (rowId: string, movieId: number) => {
    ownerOf.delete(movieId);
    owned.get(rowId)!.delete(movieId);
  };

  // 1) Cada fileira, na ordem, fica com os primeiros filmes ainda livres
  for (const row of rows) {
    for (const movie of lists.get(row.id)!) {
      if (owned.get(row.id)!.size >= limit) break;
      if (!ownerOf.has(movie.id)) give(row.id, movie.id);
    }
  }

  // 2) Dá mais um filme à fileira: um que ninguém pegou ou, se não houver, um de outra fileira que consiga repor.
  //    `visited` são as fileiras já na cadeia (não voltam a ser doadoras) e `moving` os filmes que estão trocando de fileira (a doadora
  //    não pode "repor" justamente o filme que acabou de ceder).
  const gainOne = (rowId: string, visited: Set<string>, moving: ReadonlySet<number>): boolean => {
    const mine = owned.get(rowId)!;
    const candidates = lists.get(rowId)!.filter((movie) => !mine.has(movie.id) && !moving.has(movie.id));
    for (const movie of candidates) {
      if (!ownerOf.has(movie.id)) {
        give(rowId, movie.id);
        return true;
      }
    }
    // O que a outra fileira menos valoriza vem primeiro: o filme de pior posição na lista dela
    const taken = candidates
      .filter((movie) => ownerOf.has(movie.id))
      .sort((a, b) => rankIn.get(ownerOf.get(b.id)!)!.get(b.id)! - rankIn.get(ownerOf.get(a.id)!)!.get(a.id)!);
    for (const movie of taken) {
      const donor = ownerOf.get(movie.id)!;
      if (visited.has(donor)) continue;
      visited.add(donor);
      take(donor, movie.id);
      if (gainOne(donor, visited, new Set([...moving, movie.id]))) {
        give(rowId, movie.id);
        return true;
      }
      give(donor, movie.id); // a outra fileira não tem como repor: devolve
    }
    return false;
  };

  for (const row of rows) {
    while (owned.get(row.id)!.size < limit && gainOne(row.id, new Set([row.id]), new Set())) {
      /* uma fileira de cada vez, um filme por vez */
    }
  }

  // Cada fileira mostra os seus filmes na ordem da curadoria
  const result: Record<string, T[]> = {};
  for (const row of rows) result[row.id] = lists.get(row.id)!.filter((movie) => owned.get(row.id)!.has(movie.id));
  return result;
}
