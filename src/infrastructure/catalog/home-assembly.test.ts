import { describe, expect, it } from "vitest";
import { assignHomeRows, HOME_ROW_LIMIT, HOME_ROW_ORDER } from "./home-assembly";
import { CATALOG_ROW_IDS } from "./catalog-schema";

const films = (ids: number[]) => ids.map((id) => ({ id }));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const ids = (movies: { id: number }[] | undefined) => (movies ?? []).map((m) => m.id);

describe("assignHomeRows: o que a Home sempre fez", () => {
  it("nenhum filme se repete entre fileiras", () => {
    const home = assignHomeRows([
      { id: "a", movies: films([1, 2, 3]) },
      { id: "b", movies: films([3, 4, 5]) },
    ]);
    expect(ids(home.a)).toEqual([1, 2, 3]);
    expect(ids(home.b)).toEqual([4, 5]);
  });

  it("não repete os filmes do destaque", () => {
    const home = assignHomeRows([{ id: "a", movies: films([1, 2, 3]) }], [2]);
    expect(ids(home.a)).toEqual([1, 3]);
  });

  it("respeita o limite de cada fileira", () => {
    const home = assignHomeRows([{ id: "a", movies: films(range(1, 50)) }]);
    expect(home.a).toHaveLength(HOME_ROW_LIMIT);
  });

  it("aceita fileira sem lista", () => {
    const home = assignHomeRows([{ id: "a" }, { id: "b", movies: films([1]) }]);
    expect(home.a).toEqual([]);
    expect(ids(home.b)).toEqual([1]);
  });

  it("ignora filme repetido dentro da própria fileira", () => {
    const home = assignHomeRows([{ id: "a", movies: films([1, 1, 2]) }]);
    expect(ids(home.a)).toEqual([1, 2]);
  });

  it("filme cortado pelo limite continua disponível para a fileira seguinte", () => {
    const home = assignHomeRows(
      [
        { id: "a", movies: films([1, 2, 3]) },
        { id: "b", movies: films([3, 4]) },
      ],
      [],
      2,
    );
    expect(ids(home.a)).toEqual([1, 2]);
    expect(ids(home.b)).toEqual([3, 4]);
  });

  it("quando todas fecham o limite sem ajuda, o resultado é o de sempre (primeira que pega fica com o filme)", () => {
    const home = assignHomeRows(
      [
        { id: "a", movies: films(range(1, 30)) },
        { id: "b", movies: films(range(11, 50)) },
      ],
      [],
      10,
    );
    expect(ids(home.a)).toEqual(range(1, 10));
    expect(ids(home.b)).toEqual(range(11, 20));
  });
});

describe("assignHomeRows: fileira que ficaria curta recebe filmes de quem tem reposição", () => {
  it("o caso real: duas fileiras dividem os mesmos lançamentos, e a segunda ficava com 17 de 20", () => {
    // Novidades: 37 filmes. Em Alta: 37 filmes, 20 deles também em Novidades. Limite 20.
    const novidades = range(1, 37);
    const emAlta = [...range(1, 20), ...range(101, 117)]; // 20 repetidos + 17 só dela
    const antes = assignHomeRows([{ id: "novidades", movies: films(novidades) }], [], 20);
    expect(antes.novidades).toHaveLength(20); // a conta antiga: Novidades levava 1 a 20 e sobravam só 17 para Em Alta

    const home = assignHomeRows(
      [
        { id: "novidades", movies: films(novidades) },
        { id: "em-alta", movies: films(emAlta) },
      ],
      [],
      20,
    );
    expect(home["em-alta"]).toHaveLength(20);
    expect(home.novidades).toHaveLength(20);
    const all = [...ids(home.novidades), ...ids(home["em-alta"])];
    expect(new Set(all).size).toBe(all.length); // nenhum filme repetido
  });

  it("tira da outra fileira o filme que ela menos valoriza (o de pior posição na lista dela)", () => {
    // limite 2: Novidades pega 1 e 2; Em Alta só pegaria o 3 e precisa de mais um, e Novidades tem o 4 de reposição
    const home = assignHomeRows(
      [
        { id: "novidades", movies: films([1, 2, 3, 4]) },
        { id: "em-alta", movies: films([1, 2, 3]) },
      ],
      [],
      2,
    );
    expect(ids(home["em-alta"])).toEqual([2, 3]);
    expect(ids(home.novidades)).toEqual([1, 4]); // fica com o 1 (a melhor posição) e repõe com o 4
  });

  it("mantém a ordem da curadoria dentro de cada fileira", () => {
    // limite 2: A pega 5 e 4, B só pegaria o 3 e precisa de mais um. Cede o 4 (a pior posição de A) e A repõe com o 2
    const home = assignHomeRows(
      [
        { id: "a", movies: films([5, 4, 3, 2, 1]) },
        { id: "b", movies: films([5, 4, 3]) },
      ],
      [],
      2,
    );
    expect(ids(home.a)).toEqual([5, 2]); // na ordem da lista dela: 5 antes de 2
    expect(ids(home.b)).toEqual([4, 3]); // na ordem da lista dela: 4 antes de 3
  });

  it("encadeia: A tira de B, que tira de C", () => {
    // limite 2. A só tem os filmes 1 e 2, que B pegaria; B só repõe com 3 e 4, que C pegaria; C repõe com 5 e 6
    const home = assignHomeRows(
      [
        { id: "b", movies: films([1, 2, 3, 4]) },
        { id: "a", movies: films([1, 2]) },
        { id: "c", movies: films([3, 4, 5, 6]) },
      ],
      [],
      2,
    );
    expect(ids(home.a)).toEqual([1, 2]);
    expect(ids(home.b)).toEqual([3, 4]);
    expect(ids(home.c)).toEqual([5, 6]);
  });

  it("o destaque continua fora de todas as fileiras", () => {
    const home = assignHomeRows(
      [
        { id: "novidades", movies: films([1, 2, 3, 4, 5]) },
        { id: "em-alta", movies: films([1, 2, 3]) },
      ],
      [1],
      2,
    );
    expect([...ids(home.novidades), ...ids(home["em-alta"])]).not.toContain(1);
  });

  it("só falta filme quando o conjunto das listas não tem filmes distintos suficientes", () => {
    const home = assignHomeRows(
      [
        { id: "a", movies: films([1, 2, 3]) },
        { id: "b", movies: films([1, 2, 3]) },
      ],
      [],
      2,
    );
    expect(ids(home.a).length + ids(home.b).length).toBe(3); // há 3 filmes para 4 vagas: nada se inventa
    const all = [...ids(home.a), ...ids(home.b)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("nunca deixa o estado inconsistente: nenhum filme em duas fileiras e cada fileira dentro do limite (muitos arranjos)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let round = 0; round < 300; round++) {
      const limit = 1 + Math.floor(rnd() * 6);
      const rows = ["a", "b", "c", "d"].map((id) => ({
        id,
        movies: films(Array.from({ length: Math.floor(rnd() * 12) }, () => 1 + Math.floor(rnd() * 14))),
      }));
      const excluded = rnd() < 0.5 ? [1 + Math.floor(rnd() * 14)] : [];
      const home = assignHomeRows(rows, excluded, limit);
      const all = rows.flatMap((r) => ids(home[r.id]));
      expect(new Set(all).size).toBe(all.length);
      for (const r of rows) {
        expect(home[r.id].length).toBeLessThanOrEqual(limit);
        for (const m of home[r.id]) {
          expect(excluded).not.toContain(m.id);
          expect(ids(r.movies)).toContain(m.id); // só mostra filme da própria lista
        }
      }
    }
  });
});

describe("ordem da Home", () => {
  it("cobre exatamente as fileiras do catálogo, sem repetir", () => {
    expect([...HOME_ROW_ORDER].sort()).toEqual([...CATALOG_ROW_IDS].sort());
  });

  it("Novidades vem antes de Em Alta", () => {
    expect(HOME_ROW_ORDER.indexOf("novidades")).toBeLessThan(HOME_ROW_ORDER.indexOf("em-alta"));
  });
});
