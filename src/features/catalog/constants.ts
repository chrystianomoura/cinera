/**
 * Lista oficial de gêneros para filtros do catálogo.
 */
export const GENRES = [
  "Ação",
  "Aventura",
  "Animação",
  "Comédia",
  "Crime",
  "Documentário",
  "Drama",
  "Família",
  "Fantasia",
  "História",
  "Terror",
  "Música",
  "Mistério",
  "Ficção Científica",
  "Cinema TV",
  "Thriller",
  "Guerra",
  "Faroeste",
] as const;

/**
 * Mapeamento de nome de gênero em pt-BR para o ID oficial do TMDB.
 */
export const GENRE_NAME_TO_ID: Record<string, number> = {
  "Ação": 28,
  "Aventura": 12,
  "Animação": 16,
  "Comédia": 35,
  "Crime": 80,
  "Documentário": 99,
  "Drama": 18,
  "Família": 10751,
  "Fantasia": 14,
  "História": 36,
  "Terror": 27,
  "Música": 10402,
  "Mistério": 9648,
  "Romance": 10749,
  "Ficção Científica": 878,
  "Cinema TV": 10770,
  "Thriller": 53,
  "Guerra": 10752,
  "Faroeste": 37,
};
