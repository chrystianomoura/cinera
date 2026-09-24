import type { Movie } from '@/domain';

/**
 * Filtra filmes estritamente qualificados para a vitrine:
 * - Deve ter cartaz de exibição oficial (posterPath)
 * - Deve ter nota válida maior ou igual ao piso especificado
 * - Deve ter contagem de votos relevante
 * - Opcionalmente exige sinopse real (filtro anti-trash)
 */
export const filterQualifiedMovies = (
  movies: Movie[],
  minVoteAverage: number = 6.0,
  minVoteCount: number = 20,
  requireOverview: boolean = false
): Movie[] => {
  return movies.filter(
    (m) =>
      Boolean(
        m.posterPath &&
        m.voteAverage >= minVoteAverage &&
        m.voteCount >= minVoteCount &&
        (!requireOverview || (m.overview && m.overview.trim().length >= 20))
      )
  );
};

/**
 * Normaliza o título ou saga para identificar filmes pertencentes à mesma franquia.
 */
export function getFranchiseKey(title: string, originalTitle?: string): string {
  const normalize = (t: string) => {
    let s = t.toLowerCase().trim();
    if (s.includes("harry potter")) return "harry potter";
    if (s.includes("senhor dos anéis") || s.includes("lord of the rings")) return "lord of the rings";
    if (s.includes("poderoso chefão") || s.includes("godfather")) return "the godfather";
    if (s.includes("vingadores") || s.includes("avengers")) return "avengers";
    if (s.includes("star wars") || s.includes("guerra nas estrelas")) return "star wars";
    if (s.includes("homem-aranha") || s.includes("spider-man")) return "spider-man";
    if (s.includes("batman") || s.includes("cavaleiro das trevas") || s.includes("dark knight")) return "batman";
    if (s.includes("de volta para o futuro") || s.includes("back to the future")) return "back to the future";
    if (s.includes("toy story")) return "toy story";
    if (s.includes("kill bill")) return "kill bill";
    if (s.includes("matrix")) return "matrix";
    if (s.includes("alien")) return "alien";
    if (s.includes("gladiador") || s.includes("gladiator")) return "gladiator";
    if (s.includes("exterminador do futuro") || s.includes("terminator")) return "terminator";
    if (s.includes("indiana jones")) return "indiana jones";
    if (s.includes("shrek")) return "shrek";
    if (s.includes("mad max")) return "mad max";
    if (s.includes("jurassic")) return "jurassic";
    if (s.includes("duna") || s.includes("dune")) return "dune";
    if (s.includes("blade runner")) return "blade runner";
    if (s.includes("top gun")) return "top gun";
    if (s.includes("avatar")) return "avatar";
    if (s.includes("planeta dos macacos") || s.includes("planet of the apes")) return "planet of the apes";
    if (s.includes("missão: impossível") || s.includes("missao impossivel") || s.includes("mission: impossible")) return "mission impossible";

    if (s.includes(":")) {
      s = s.split(":")[0].trim();
    }
    if (s.includes(" - ")) {
      s = s.split(" - ")[0].trim();
    }
    s = s.replace(/\s+(parte\s+[ivx\d]+|vol\.\s*\d+|\d+|[ivx]+)$/i, "").trim();
    return s;
  };

  const key1 = normalize(title);
  if (originalTitle) {
    const key2 = normalize(originalTitle);
    if (key2.length < key1.length && key2.length > 3) return key2;
  }
  return key1;
}

/**
 * Deduplica títulos pertencentes à mesma franquia, mantendo estritamente
 * o filme com a maior nota (já que a lista original vem ordenada decrescente por nota).
 */
export function dedupeFranchises(movies: Movie[]): Movie[] {
  const seenFranchises = new Set<string>();
  const result: Movie[] = [];
  for (const m of movies) {
    const key = getFranchiseKey(m.title, m.originalTitle);
    if (!seenFranchises.has(key)) {
      seenFranchises.add(key);
      result.push(m);
    }
  }
  return result;
}
