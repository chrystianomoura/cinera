// Curadoria da fileira "Clássicos Indispensáveis" (filmes até 1999).
// Uso: npm run curate:classicos            (só mostra o relatório)
//      npm run curate:classicos -- --write  (grava a fileira em public/catalog.json)
import { runRow, type RowDefinition } from "./curation/pipeline.js";

const definition: RowDefinition = {
  id: "classicos",
  label: "Clássicos Indispensáveis",
  config: {
    minImdbVotes: 50_000,
    maxDivergence: 1.0,
    minConsensus: 8.0,
    // Clássico se prova pelo tempo e pelo público, não só por prêmio
    requirePrestige: false,
    strictFranchiseBlock: 20,
    franchiseSpacing: 10,
    maxPerFranchise: 1,
  },
  listSize: 40,
  // 10 fixos no começo; o resto gira em faixas entre os demais clássicos aprovados
  rotation: { coreSize: 10, periodDays: 6 },
  // Animação entra: O Rei Leão, A Princesa Mononoke e outros clássicos do gênero
  discoverBase: "primary_release_date.lte=1999-12-31&vote_count.gte=1500&language=pt-BR",
  pagesByRating: 25,
  pagesByVotes: 10,
  // Só gasta consulta do OMDb com quem tem chance real de chegar ao consenso mínimo
  omdbMinTmdbRating: 7.7,
  currentQuery:
    "/discover/movie?language=pt-BR&sort_by=vote_average.desc&vote_count.gte=3000&primary_release_date.lte=1999-12-31&without_genres=16",
  currentFilters: { minRating: 7.5, minVotes: 500 },
};

runRow(definition).catch((error) => {
  console.error(error);
  process.exit(1);
});
