/**
 * Lista oficial de macrogêneros de streaming para o catálogo do Cinera.
 * Consolidação elegante baseada no padrão dos maiores serviços mundiais (Netflix, HBO Max, Disney+).
 */
export const GENRES = [
  "Ação & Aventura",
  "Ficção & Fantasia",
  "Comédia",
  "Suspense & Crime",
  "Terror",
  "Animação",
  "Drama",
  "Romance",
  "Documentário",
] as const;

/**
 * Mapeamento das categorias consolidadas para os IDs do TMDB.
 * Utiliza o operador OR nativo ('|') do TMDB para unir gêneros complementares sem ifs artificiais.
 */
export const GENRE_NAME_TO_QUERY: Record<string, string> = {
  "Ação & Aventura": "28|12",
  "Ficção & Fantasia": "878|14",
  "Comédia": "35",
  "Suspense & Crime": "53|80",
  "Terror": "27",
  "Animação": "16",
  "Drama": "18",
  "Romance": "10749",
  "Documentário": "99",
};

export const GENRE_NAME_TO_ID = GENRE_NAME_TO_QUERY;

