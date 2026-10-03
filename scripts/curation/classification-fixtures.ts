// Painel de testes da classificação: filmes de referência com as categorias esperadas.
// Não são exceções aplicadas na prática (a regra vale para todos os filmes): servem de alarme.
// Se uma mudança nas regras quebrar um deles, o teste avisa antes de o catálogo ser publicado.
import { classifyMovie, type CineraCategory } from "../../src/domain/classification.js";

interface Fixture {
  title: string;
  tmdb: string[];
  imdb: string[];
  /** Categorias em que o filme precisa estar */
  in?: CineraCategory[];
  /** Categorias em que o filme NÃO pode estar */
  notIn?: CineraCategory[];
  /** Categoria que precisa aparecer primeiro no rótulo da ficha */
  first?: CineraCategory;
  /** O filme só pode viver nestas categorias (formatos) */
  only?: CineraCategory[];
  /** Limitação conhecida: as duas fontes discordam do que se espera; fica registrada, sem reprovar */
  knownLimitation?: boolean;
}

export const FIXTURES: Fixture[] = [
  { title: "Capitão Phillips", tmdb: ["Ação", "Drama", "Thriller"], imdb: ["Action", "Biography", "Crime"], in: ["Drama", "Suspense & Crime"], notIn: ["Ação & Aventura"], first: "Drama" },
  { title: "Ford vs Ferrari", tmdb: ["Drama", "História", "Ação"], imdb: ["Action", "Biography", "Drama"], in: ["Drama"], notIn: ["Ação & Aventura"] },
  { title: "Forrest Gump", tmdb: ["Comédia", "Drama", "Romance"], imdb: ["Drama", "Romance"], in: ["Drama", "Romance"], notIn: ["Comédia"], first: "Drama" },
  { title: "La La Land", tmdb: ["Comédia", "Drama", "Romance"], imdb: ["Comedy", "Drama", "Music"], in: ["Drama"], notIn: ["Comédia"] },
  { title: "Birdman", tmdb: ["Drama", "Comédia"], imdb: ["Comedy", "Drama"], in: ["Drama", "Comédia"], first: "Drama" },
  { title: "Aliens: O Resgate", tmdb: ["Ação", "Thriller", "Ficção científica"], imdb: ["Action", "Adventure", "Horror"], in: ["Ação & Aventura", "Ficção & Fantasia"], first: "Ação & Aventura" },
  { title: "Duro de Matar", tmdb: ["Ação", "Thriller"], imdb: ["Action", "Thriller"], in: ["Ação & Aventura", "Suspense & Crime"], first: "Ação & Aventura" },
  { title: "Matrix", tmdb: ["Ação", "Ficção científica"], imdb: ["Action", "Sci-Fi"], in: ["Ação & Aventura", "Ficção & Fantasia"] },
  { title: "Parasita", tmdb: ["Comédia", "Thriller", "Drama"], imdb: ["Drama", "Thriller"], in: ["Drama", "Suspense & Crime"], notIn: ["Comédia"] },
  { title: "Titanic", tmdb: ["Drama", "Romance"], imdb: ["Drama", "Romance"], in: ["Drama", "Romance"], first: "Drama" },
  { title: "Interestelar", tmdb: ["Aventura", "Drama", "Ficção científica"], imdb: ["Adventure", "Drama", "Sci-Fi"], in: ["Ficção & Fantasia"], first: "Ficção & Fantasia" },
  { title: "O Poderoso Chefão", tmdb: ["Drama", "Crime"], imdb: ["Crime", "Drama"], in: ["Drama", "Suspense & Crime"], first: "Drama" },
  { title: "O.J.: Made in America", tmdb: ["Documentário", "Crime", "História"], imdb: ["Documentary", "Biography", "Crime"], only: ["Documentário"] },
  { title: "Hércules", tmdb: ["Animação", "Família", "Fantasia", "Aventura", "Comédia", "Romance"], imdb: ["Animation", "Adventure", "Comedy"], only: ["Animação"] },
  { title: "Túmulo dos Vagalumes", tmdb: ["Animação", "Drama", "Guerra"], imdb: ["Animation", "Drama", "War"], only: ["Animação"] },
  { title: "Valsa com Bashir", tmdb: ["Animação", "Documentário", "Drama"], imdb: ["Animation", "Documentary", "Drama"], only: ["Documentário"] },
  { title: "Pulp Fiction", tmdb: ["Thriller", "Crime"], imdb: ["Crime", "Drama"], in: ["Suspense & Crime"] },
  { title: "O Iluminado", tmdb: ["Terror", "Thriller"], imdb: ["Drama", "Horror"], in: ["Terror"] },
  // Mínimo de 2 categorias quando o filme tem gêneros para isso; formatos e filmes de um gênero só têm 1
  { title: "O Show de Truman", tmdb: ["Comédia", "Drama"], imdb: ["Comedy", "Drama", "Sci-Fi"], in: ["Drama", "Comédia"] },
  { title: "Ford vs Ferrari (categorias)", tmdb: ["Drama", "História", "Ação"], imdb: ["Action", "Biography", "Drama"], only: ["Drama"] },
  { title: "Tempo de Glória", tmdb: ["Drama", "História", "Guerra"], imdb: ["Biography", "Drama", "History"], in: ["Drama"] },
  { title: "Os Imperdoáveis", tmdb: ["Faroeste"], imdb: ["Drama", "Western"], in: ["Ação & Aventura"] },
  { title: "Amnésia", tmdb: ["Mistério", "Thriller"], imdb: ["Mystery", "Thriller"], only: ["Suspense & Crime"] },
  { title: "Kramer vs. Kramer", tmdb: ["Drama"], imdb: ["Drama"], only: ["Drama"] },
  { title: "Túmulo dos Vagalumes (categorias)", tmdb: ["Animação", "Drama", "Guerra"], imdb: ["Animation", "Drama", "War"], only: ["Animação"] },
  // Limitação conhecida: TMDB e IMDb marcam Ação em primeiro e não há tag de história real
  { title: "Operação França", tmdb: ["Ação", "Crime", "Thriller"], imdb: ["Action", "Crime", "Drama"], notIn: ["Ação & Aventura"], knownLimitation: true },
];

export interface FixtureResult {
  title: string;
  categories: CineraCategory[];
  ok: boolean;
  known: boolean;
  problem: string;
}

export function runFixtures(): FixtureResult[] {
  return FIXTURES.map((f) => {
    const categories = classifyMovie({ tmdbGenres: f.tmdb, imdbGenres: f.imdb });
    const problems: string[] = [];
    for (const c of f.in ?? []) if (!categories.includes(c)) problems.push(`faltou ${c}`);
    for (const c of f.notIn ?? []) if (categories.includes(c)) problems.push(`não devia estar em ${c}`);
    if (f.first && categories[0] !== f.first) problems.push(`devia começar por ${f.first}, mas começa por ${categories[0]}`);
    if (f.only && (categories.length !== f.only.length || !f.only.every((c) => categories.includes(c)))) problems.push(`devia viver só em ${f.only.join(", ")}`);
    return { title: f.title, categories, ok: problems.length === 0, known: Boolean(f.knownLimitation), problem: problems.join("; ") };
  });
}
