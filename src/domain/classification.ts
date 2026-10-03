/**
 * Classificação única do Cinera: a partir dos gêneros do TMDB (e, quando existem, dos gêneros do IMDb),
 * decide em quais das 9 categorias o filme vive. O rótulo da ficha e as categorias da Home usam exatamente
 * esta mesma função e os mesmos nomes, então um filme de uma categoria sempre mostra essa categoria na ficha.
 *
 * Código puro, sem dependências: roda no app e nos scripts de curadoria.
 */

export const CINERA_CATEGORIES = [
  "Ação & Aventura",
  "Animação",
  "Comédia",
  "Documentário",
  "Drama",
  "Ficção & Fantasia",
  "Romance",
  "Suspense & Crime",
  "Terror",
] as const;

export type CineraCategory = (typeof CINERA_CATEGORIES)[number];

/** Quantas categorias um filme pode ter (as principais) */
export const MAX_CATEGORIES = 2;

/** Gênero do TMDB (em português) → categoria do Cinera. Gêneros sem categoria própria vão para a mais próxima. */
const GENRE_TO_CATEGORY: Record<string, CineraCategory | null> = {
  "Ação": "Ação & Aventura",
  "Aventura": "Ação & Aventura",
  "Faroeste": "Ação & Aventura",
  "Animação": "Animação",
  "Comédia": "Comédia",
  "Documentário": "Documentário",
  "Drama": "Drama",
  "Guerra": "Drama",
  "História": "Drama",
  "Música": "Drama",
  "Ficção científica": "Ficção & Fantasia",
  "Fantasia": "Ficção & Fantasia",
  "Romance": "Romance",
  "Thriller": "Suspense & Crime",
  "Suspense": "Suspense & Crime",
  "Crime": "Suspense & Crime",
  "Mistério": "Suspense & Crime",
  "Terror": "Terror",
  "Família": null,
  "Cinema TV": null,
};

/** Quanto cada gênero "define" um filme. Drama é o gênero de fundo: perde para quase tudo que vier com ele. */
const GENRE_WEIGHT: Record<string, number> = {
  "Terror": 9,
  "Ficção científica": 9,
  "Ação": 8.5,
  "Fantasia": 8,
  "Crime": 8,
  "Thriller": 8,
  "Suspense": 8,
  "Aventura": 7.5,
  "Faroeste": 7,
  "Romance": 7,
  "Comédia": 7,
  "Drama": 6.5,
  "Guerra": 6.5,
  "Mistério": 6,
  "História": 5,
  "Música": 4,
};

/** Gêneros do IMDb (em inglês) → gêneros do TMDB (em português). Biography e Sport não têm equivalente. */
const IMDB_TO_TMDB: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Animation: "Animação",
  Comedy: "Comédia",
  Crime: "Crime",
  Documentary: "Documentário",
  Drama: "Drama",
  Family: "Família",
  Fantasy: "Fantasia",
  History: "História",
  Horror: "Terror",
  Music: "Música",
  Musical: "Música",
  Mystery: "Mistério",
  Romance: "Romance",
  "Sci-Fi": "Ficção científica",
  Thriller: "Thriller",
  War: "Guerra",
  Western: "Faroeste",
};

/** Gêneros que, num filme baseado em fatos reais (Biography no IMDb), deixam de ser o gênero principal. */
const DEMOTED_BY_TRUE_STORY = new Set(["Ação", "Aventura", "Terror", "Faroeste"]);

export interface ClassificationInput {
  /** Gêneros do TMDB, em português, na ordem do TMDB */
  tmdbGenres: string[];
  /** Gêneros do IMDb (em inglês, como o OMDb devolve), quando disponíveis */
  imdbGenres?: string[] | null;
}

/**
 * Regras, em camadas:
 * 1. Documentário e Animação são formatos: se o filme é um deles, ele vive só nessa categoria
 *    (Documentário vence Animação). O filme cujo único gênero é Música (um show filmado) conta como Documentário.
 * 2. Duas fontes: um gênero que o IMDb também cita pesa mais. O OMDb devolve no máximo 3 gêneros do IMDb,
 *    em ordem alfabética: lista com 3 ou mais pode estar cortada, então a ausência de um gênero nela não prova
 *    nada (nem Romance, Sci-Fi ou Thriller, que ficam no fim do alfabeto). Só uma lista curta (menos de 3)
 *    está completa, e aí um gênero que o TMDB cita e o IMDb não cita é descartado.
 * 3. História real (Biography no IMDb) tira Ação, Aventura e Terror da disputa quando há outros gêneros.
 * 4. Drama junto com Comédia conta como drama: a comédia só vale quando não há Drama no filme.
 * Devolve até {@link MAX_CATEGORIES} categorias, da mais forte para a mais fraca. Na ordem, Drama (o gênero de
 * fundo, de peso baixo) só passa à frente quando o TMDB já o lista antes da outra categoria; assim "Drama /
 * Romance" e "Drama / Suspense & Crime" saem na ordem que as pessoas esperam para dramas de verdade.
 */
export function classifyMovie({ tmdbGenres, imdbGenres }: ClassificationInput): CineraCategory[] {
  const imdbRaw = imdbGenres ?? [];
  const imdb = imdbRaw.map((g) => IMDB_TO_TMDB[g]).filter((g): g is string => Boolean(g));
  const all = new Set([...tmdbGenres, ...imdb]);

  // 1. Formatos. Filme só de "Música" é, quase sempre, um show filmado: vive em Documentário
  if (all.has("Documentário") || (tmdbGenres.length === 1 && tmdbGenres[0] === "Música")) return ["Documentário"];
  if (all.has("Animação")) return ["Animação"];

  let candidates = [...tmdbGenres];

  // 3. História real
  if (imdbRaw.includes("Biography")) {
    const rest = candidates.filter((g) => !DEMOTED_BY_TRUE_STORY.has(g));
    if (rest.length >= 2) candidates = rest;
  }

  // 4. Drama + Comédia = drama (o Drama pode vir só do IMDb)
  if (all.has("Drama") && all.has("Comédia")) {
    candidates = candidates.filter((g) => g !== "Comédia");
    if (!candidates.includes("Drama")) candidates.push("Drama");
  }

  // 2. Duas fontes: com a lista do IMDb completa, o gênero que ela não confirma sai da disputa
  const imdbComplete = imdbRaw.length > 0 && imdbRaw.length < 3;
  if (imdbComplete) {
    const confirmed = candidates.filter((g) => imdb.includes(g));
    if (confirmed.some((g) => GENRE_TO_CATEGORY[g])) candidates = confirmed;
  }

  // Pontuação por gênero e, daí, por categoria (vale o gênero mais forte de cada uma)
  const scoreByCategory = new Map<CineraCategory, { score: number; order: number }>();
  candidates.forEach((genre, order) => {
    const category = GENRE_TO_CATEGORY[genre];
    if (!category) return;
    let score = GENRE_WEIGHT[genre] ?? 6;
    // A ordem da lista do IMDb é alfabética, não de relevância: só conta se o gênero aparece nela
    if (imdb.includes(genre)) score += 3;
    const current = scoreByCategory.get(category);
    if (!current || score > current.score) scoreByCategory.set(category, { score, order: current?.order ?? order });
  });

  const top = [...scoreByCategory.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[1].order - b[1].order)
    .slice(0, MAX_CATEGORIES)
    .map(([category]) => category);

  // 5. Mínimo de 2: se as regras acima deixaram só 1 categoria, a segunda vem do melhor gênero restante do
  //    filme (mesmo os que as regras de cima afastaram, como a Comédia num filme só Drama e Comédia). Só não
  //    entra o gênero que a história real afastou, nem o que a lista completa do IMDb desmente.
  if (top.length < MAX_CATEGORIES) {
    const trueStory = imdbRaw.includes("Biography");
    const filler = tmdbGenres
      .map((genre, order) => ({ genre, order, category: GENRE_TO_CATEGORY[genre] }))
      .filter(({ genre, category }) => category && !top.includes(category) && !(trueStory && DEMOTED_BY_TRUE_STORY.has(genre)) && !(imdbComplete && !imdb.includes(genre)))
      .sort((a, b) => (GENRE_WEIGHT[b.genre] ?? 3) - (GENRE_WEIGHT[a.genre] ?? 3) || a.order - b.order)[0];
    if (filler?.category) top.push(filler.category);
  }

  // Ordem de exibição: Drama primeiro só se, nas tags do TMDB, a primeira das duas categorias for Drama
  if (top.length === 2 && top.includes("Drama")) {
    const firstInTmdb = tmdbGenres.map((g) => GENRE_TO_CATEGORY[g]).find((c) => c && top.includes(c));
    if (firstInTmdb === "Drama") return ["Drama", ...top.filter((c) => c !== "Drama")];
  }
  return top;
}

/** Rótulo da ficha: as categorias do filme separadas por barra (ex.: "Drama / Suspense & Crime"). A ficha mostra só os nomes das 9 categorias. */
export function formatCategories(categories?: readonly string[] | null): string | null {
  return categories && categories.length > 0 ? categories.join(" / ") : null;
}
