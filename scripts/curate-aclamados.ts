// Curadoria da fileira "Aclamados pela Crítica".
// Uso: npm run curate:aclamados            (só mostra o relatório)
//      npm run curate:aclamados -- --write  (grava a fileira em public/catalog.json)
import { runRow, type RowDefinition } from "./curation/pipeline.js";

const definition: RowDefinition = {
  id: "aclamados",
  label: "Aclamados pela Crítica",
  config: {
    minImdbVotes: 50_000,
    maxDivergence: 1.0,
    minConsensus: 8.0,
    requirePrestige: true,
    strictFranchiseBlock: 20,
    franchiseSpacing: 10,
    maxPerFranchise: 1,
  },
  listSize: 40,
  // 10 fixos no começo; o resto gira em faixas entre a fila principal (piso 8,0) e a reserva (piso 7,6 com prestígio forte)
  rotation: { coreSize: 10, periodDays: 4 },
  reserve: { minConsensus: 7.6 },
  // Animação entra: obras como A Viagem de Chihiro disputam em pé de igualdade
  discoverBase: "primary_release_date.gte=2000-01-01&vote_count.gte=1000&language=pt-BR",
  pagesByRating: 80,
  pagesByVotes: 100,
  // Premiados com nota TMDB mais baixa (Moonlight, Nomadland, Birdman) só entram se o OMDb for consultado
  omdbMinTmdbRating: 7.0,
  currentQuery:
    "/discover/movie?language=pt-BR&sort_by=vote_average.desc&vote_count.gte=2000&primary_release_date.gte=2000-01-01&without_genres=16",
  currentFilters: { minRating: 7.5, minVotes: 500 },
  // Fileira de perfil hollywoodiano por decisão editorial: produções brasileiras ficam de fora
  editorialExclusion: (d) => (d.origin_country?.includes("BR") ? "produção brasileira (fileira hollywoodiana)" : null),
};

runRow(definition).catch((error) => {
  console.error(error);
  process.exit(1);
});
