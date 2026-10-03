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
    maxPerFranchise: 2,
  },
  listSize: 40,
  discoverBase: "primary_release_date.gte=2000-01-01&without_genres=16&vote_count.gte=1000&language=pt-BR",
  pagesByRating: 40,
  pagesByVotes: 10,
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
