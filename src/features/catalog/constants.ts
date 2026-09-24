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

export type GenreCategory = (typeof GENRES)[number];

export interface GenreProfile {
  withGenres: string;
  withoutGenres?: string;
  withoutKeywords?: string;
  sortBy: string;
  minVoteAverage: number;
  minVoteCount: number;
  primaryGenreId?: number;
  description: string;
}

/**
 * Perfis editoriais com curadoria para streaming de alta fidelidade:
 * - Exclusão cruzada (withoutGenres) para impedir que filmes de explosão/herói tomem conta de comédias, romances e dramas
 * - Keywords nativas (withoutKeywords) para isolar filmes de super-herói (9715, 9717) na categoria de Ficção & Fantasia
 * - Critérios de ordenação sob medida (sortBy) para valorizar clássicos do suspense e épicos da ficção
 * - Calibração de nota mínima e contagem de votos para manter um piso de qualidade impecável
 */
export const GENRE_PROFILES: Record<string, GenreProfile> = {
  "Ação & Aventura": {
    withGenres: "28|12",
    withoutGenres: "16,14,10751", // Sem animações, sem fantasia mística e sem filmes infantis/família (Sonic) - mantendo Ficção para resgatar Matrix, Mad Max, etc.
    withoutKeywords: "9715,9717", // Sem filmes de super-herói da Marvel/DC ou baseados em quadrinhos
    sortBy: "popularity.desc",
    minVoteAverage: 6.2,
    minVoteCount: 80,
    primaryGenreId: 28,
    description: "Grandes produções, adrenalina pura e jornadas eletrizantes",
  },
  "Ficção & Fantasia": {
    withGenres: "878|14",
    withoutGenres: "16,10749", // Sem animações infantis, sem romances açucarados
    sortBy: "vote_count.desc", // Obras consagradas, universos de heróis e visões monumentais da ficção
    minVoteAverage: 6.8,
    minVoteCount: 1000,
    primaryGenreId: 878,
    description: "Grandes odisseias cósmicas, universos fantásticos e ficção visionária",
  },
  "Comédia": {
    withGenres: "35",
    withoutGenres: "28,12,27,16,53,80", // Sem Ação, Aventura, Terror, Animação, Suspense ou Crime: apenas COMÉDIA LEGÍTIMA
    sortBy: "popularity.desc",
    minVoteAverage: 6.0,
    minVoteCount: 100,
    primaryGenreId: 35,
    description: "As melhores risadas, sátiras afiadas e histórias leves para se divertir",
  },
  "Suspense & Crime": {
    withGenres: "53|80",
    withoutGenres: "28,16,10749,10751", // Sem tiroteio/ação desenfreada, animação, romance nem filmes infantis
    sortBy: "vote_count.desc", // Thrillers atemporais, mistérios e investigações lendárias
    minVoteAverage: 7.0,
    minVoteCount: 1200,
    primaryGenreId: 53,
    description: "Mistérios envolventes, investigações criminais e reviravoltas clássicas",
  },
  "Terror": {
    withGenres: "27",
    withoutGenres: "16,35,10751", // Sem animações, comédia nem filmes infantis
    sortBy: "popularity.desc", // Terror vive de novidades e arrepios recentes
    minVoteAverage: 5.8,
    minVoteCount: 80,
    primaryGenreId: 27,
    description: "Histórias arrepiantes, suspense psicológico e experiências viscerais",
  },
  "Animação": {
    withGenres: "16",
    withoutGenres: undefined,
    sortBy: "vote_count.desc", // As maiores obras-primas da animação mundial
    minVoteAverage: 7.0,
    minVoteCount: 800,
    primaryGenreId: 16,
    description: "Obras-primas visuais e mundos encantadores para todas as idades",
  },
  "Drama": {
    withGenres: "18",
    withoutGenres: "28,27,16", // Sem explosões de ação e sem terror descartável
    sortBy: "vote_average.desc", // Cinema premiado, humano e aclamado
    minVoteAverage: 7.2,
    minVoteCount: 1500,
    primaryGenreId: 18,
    description: "Narrativas profundas, atuações memoráveis e grandes obras premiadas",
  },
  "Romance": {
    withGenres: "10749",
    withoutGenres: "28,27,878,16,14,80", // Sem ação, terror, sci-fi, animação, fantasia de quadrinhos ou crime
    sortBy: "popularity.desc",
    minVoteAverage: 6.2,
    minVoteCount: 80,
    primaryGenreId: 10749,
    description: "Histórias de amor inesquecíveis, conexões profundas e paixão",
  },
  "Documentário": {
    withGenres: "99",
    withoutGenres: "16",
    sortBy: "vote_count.desc",
    minVoteAverage: 7.0,
    minVoteCount: 50,
    primaryGenreId: 99,
    description: "Histórias reais fascinantes, investigações e registros históricos",
  },
};

/**
 * Mapeamento das categorias consolidadas para os IDs do TMDB.
 * Mantido para retrocompatibilidade de consultas legadas.
 */
export const GENRE_NAME_TO_QUERY: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_PROFILES).map(([name, profile]) => [name, profile.withGenres])
);

export const GENRE_NAME_TO_ID = GENRE_NAME_TO_QUERY;

