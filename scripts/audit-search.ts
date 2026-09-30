import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Execute este script via: npx tsx scripts/audit-search.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envLocalPath = path.join(projectRoot, ".env.local");

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0 && process.env[key.trim()] === undefined) {
      let val = rest.join("=").trim();
      val = val.replace(/^["']|["']$/g, "").replace(/\s+#.*$/, "");
      process.env[key.trim()] = val;
    }
  }
}

// Importa dinamicamente após injetar variáveis de ambiente
const { searchCineraMovies } = await import("../src/infrastructure/search/search-service.js");

const REQUEST_TIMEOUT_MS = 10_000;
const searchWithTimeout = (query: string) =>
  Promise.race([
    searchCineraMovies(query),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout de rede (${REQUEST_TIMEOUT_MS}ms) excedido na busca por "${query}"`)),
        REQUEST_TIMEOUT_MS
      )
    ),
  ]);

/**
 * Normalizador resiliente para asserções de teste:
 * Remove diacríticos, pontuação e converte números romanos (I, II, III, IV) para inteiros
 * para evitar falsos alarmes de distribuidoras de cinema.
 */
function normalizeAssertString(text: string): string {
  let s = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Mapeia numerais romanos isolados em títulos para números
  s = s.replace(/\bviii\b/g, "8")
       .replace(/\bvii\b/g, "7")
       .replace(/\bvi\b/g, "6")
       .replace(/\biv\b/g, "4")
       .replace(/\biii\b/g, "3")
       .replace(/\bii\b/g, "2")
       .replace(/\bi\b/g, "1");

  return s;
}

interface TestCase {
  category: string;
  query: string;
  exactTop1Movie?: string;          // O primeiríssimo filme DEVE ser este
  expectedTopMovies?: string[];      // Pelo menos 1 destes deve estar no Top 3
  mustIncludeAll?: string[];         // Todos estes devem constar nos resultados
  mustBeChronological?: boolean;     // Os filmes da saga devem estar por ordem de data
  minResults?: number;               // Mínimo de resultados esperados
  maxLatencyMs?: number;             // Limite aceitável de tempo de resposta em milissegundos
  simulateTyping?: boolean;          // Simula digitação letra a letra da palavra
  shouldNotInclude?: string[];       // Lixo ou filmes não relacionados que NÃO podem aparecer
}

const TEST_CASES: TestCase[] = [
  // 1. Sagas Canônicas Clássicas & Ordem Cronológica
  {
    category: "Sagas Canônicas",
    query: "toy story",
    exactTop1Movie: "Toy Story",
    mustIncludeAll: ["Toy Story 2", "Toy Story 3", "Toy Story 4"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "senhor dos aneis",
    expectedTopMovies: ["O Senhor dos Anéis: A Sociedade do Anel"],
    mustIncludeAll: ["As Duas Torres", "O Retorno do Rei"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "harry potter",
    expectedTopMovies: ["Harry Potter e a Pedra Filosofal"],
    mustIncludeAll: ["Câmara Secreta", "Prisioneiro de Azkaban", "Cálice de Fogo"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "matrix",
    exactTop1Movie: "Matrix",
    mustIncludeAll: ["Matrix Reloaded", "Matrix Revolutions"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "velozes e furiosos",
    expectedTopMovies: ["Velozes e Furiosos", "Velozes & Furiosos"],
    mustIncludeAll: ["Velozes & Furiosos 7", "Velozes & Furiosos 10"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "shrek",
    exactTop1Movie: "Shrek",
    mustIncludeAll: ["Shrek 2", "Shrek Terceiro"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "rocky",
    expectedTopMovies: ["Rocky: Um Lutador", "Rocky"],
    mustIncludeAll: ["Rocky 2", "Rocky 3", "Rocky 4"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "missao impossivel",
    expectedTopMovies: ["Missão: Impossível", "Missão Impossível"],
    mustIncludeAll: ["Missão: Impossível 2", "Missão: Impossível 3"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "de volta para o futuro",
    exactTop1Movie: "De Volta para o Futuro",
    mustIncludeAll: ["De Volta para o Futuro 2", "De Volta para o Futuro 3"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "alien",
    exactTop1Movie: "Alien: O Oitavo Passageiro",
    mustIncludeAll: ["Aliens: O Resgate", "Alien 3"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "indiana jones",
    expectedTopMovies: ["Caçadores da Arca Perdida"],
    mustIncludeAll: ["Templo da Perdição", "Última Cruzada"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "jogos vorazes",
    exactTop1Movie: "Jogos Vorazes",
    mustIncludeAll: ["Em Chamas", "A Esperança"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "homem de ferro",
    exactTop1Movie: "Homem de Ferro",
    mustIncludeAll: ["Homem de Ferro 2", "Homem de Ferro 3"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "john wick",
    expectedTopMovies: ["John Wick - De Volta ao Jogo", "John Wick: De Volta ao Jogo", "John Wick"],
    mustIncludeAll: ["Um Novo Dia para Matar", "Parabellum", "Baba Yaga"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "jurassic park",
    expectedTopMovies: ["Jurassic Park: O Parque dos Dinossauros"],
    mustIncludeAll: ["O Mundo Perdido: Jurassic Park", "Jurassic Park 3"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "crepusculo",
    exactTop1Movie: "Crepúsculo",
    mustIncludeAll: ["Lua Nova", "Eclipse", "Amanhecer"],
    mustBeChronological: true,
  },
  {
    category: "Sagas Canônicas",
    query: "batman",
    expectedTopMovies: ["Batman"],
    minResults: 5,
  },

  // 2. Busca Incremental & Digitação Contínua (Search-As-You-Type)
  {
    category: "Search-As-You-Type (Bigramas)",
    query: "toy st",
    expectedTopMovies: ["Toy Story"],
    minResults: 1,
  },
  {
    category: "Search-As-You-Type (Stopwords Trailing)",
    query: "101 da",
    expectedTopMovies: ["101 Dálmatas", "101 Dálmatas: O Filme"],
    minResults: 1,
  },
  {
    category: "Search-As-You-Type (Prefixos Curtos)",
    query: "deadp",
    exactTop1Movie: "Deadpool",
    minResults: 2,
  },
  {
    category: "Search-As-You-Type (Bigramas)",
    query: "star wa",
    expectedTopMovies: ["Star Wars", "Guerra nas Estrelas"],
    minResults: 3,
  },
  {
    category: "Search-As-You-Type (Bigramas)",
    query: "mad ma",
    expectedTopMovies: ["Mad Max"],
    minResults: 2,
  },
  {
    category: "Search-As-You-Type (Palavras Curtas)",
    query: "up",
    expectedTopMovies: ["Up: Altas Aventuras", "Up"],
    minResults: 1,
  },
  {
    category: "Search-As-You-Type (Palavras Curtas)",
    query: "it",
    expectedTopMovies: ["It: A Coisa", "It"],
    minResults: 1,
  },
  {
    category: "Search-As-You-Type (Hífen)",
    query: "spider-man",
    expectedTopMovies: ["Homem-Aranha"],
    minResults: 3,
  },

  // 3. Simulação de Digitação Humana Passo a Passo (Keystroke by Keystroke)
  {
    category: "Simulação de Digitação Humana",
    query: "matrix",
    simulateTyping: true,
    exactTop1Movie: "Matrix",
  },
  {
    category: "Simulação de Digitação Humana",
    query: "avatar",
    simulateTyping: true,
    exactTop1Movie: "Avatar",
  },
  {
    category: "Simulação de Digitação Humana",
    query: "shrek",
    simulateTyping: true,
    exactTop1Movie: "Shrek",
  },

  // 4. Cognatos & Termos em Inglês
  {
    category: "Termos em Inglês / Cognatos",
    query: "spiderman",
    expectedTopMovies: ["Homem-Aranha"],
    mustIncludeAll: ["Homem-Aranha 2", "Homem-Aranha 3"],
  },
  {
    category: "Termos em Inglês / Cognatos",
    query: "avengers",
    expectedTopMovies: ["Os Vingadores", "Vingadores"],
    minResults: 3,
  },
  {
    category: "Termos em Inglês / Cognatos",
    query: "predator",
    expectedTopMovies: ["O Predador", "Predador"],
    minResults: 2,
  },

  // 5. Filmes Autorais & Obras-Primas Únicas (Exige Top 1 Obrigatório)
  {
    category: "Top 1 Obrigatório",
    query: "interstellar",
    exactTop1Movie: "Interestelar",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "parasita",
    exactTop1Movie: "Parasita",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "clube da luta",
    exactTop1Movie: "Clube da Luta",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "oppenheimer",
    exactTop1Movie: "Oppenheimer",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "cidade de deus",
    exactTop1Movie: "Cidade de Deus",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "bastardos inglorios",
    exactTop1Movie: "Bastardos Inglórios",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "pulp fiction",
    exactTop1Movie: "Pulp Fiction: Tempo de Violência",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "o poderoso chefao",
    exactTop1Movie: "O Poderoso Chefão",
    mustIncludeAll: ["Parte II", "Parte III"],
    mustBeChronological: true,
  },
  {
    category: "Top 1 Obrigatório",
    query: "whiplash",
    exactTop1Movie: "Whiplash: Em Busca da Perfeição",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "la la land",
    exactTop1Movie: "La La Land: Cantando Estações",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "django livre",
    exactTop1Movie: "Django Livre",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "o lobo de wall street",
    exactTop1Movie: "O Lobo de Wall Street",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "gladiador",
    exactTop1Movie: "Gladiador",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "ilha do medo",
    exactTop1Movie: "Ilha do Medo",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "matrix reloaded",
    exactTop1Movie: "Matrix Reloaded",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "corra",
    exactTop1Movie: "Corra!",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "o menino e a garca",
    exactTop1Movie: "O Menino e a Garça",
    minResults: 1,
  },
  {
    category: "Top 1 Obrigatório",
    query: "duna",
    exactTop1Movie: "Duna",
    mustIncludeAll: ["Duna: Parte Dois"],
    minResults: 2,
  },

  // 6. Clássicos Históricos do Cinema
  {
    category: "Clássicos Históricos",
    query: "casablanca",
    exactTop1Movie: "Casablanca",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "cidadao kane",
    exactTop1Movie: "Cidadão Kane",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "psicose",
    exactTop1Movie: "Psicose",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "cantando na chuva",
    exactTop1Movie: "Cantando na Chuva",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "2001 uma odisseia no espaco",
    exactTop1Movie: "2001: Uma Odisseia no Espaço",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "laranja mecanica",
    exactTop1Movie: "Laranja Mecânica",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "o iluminado",
    exactTop1Movie: "O Iluminado",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "taxi driver",
    exactTop1Movie: "Taxi Driver",
    minResults: 1,
  },
  {
    category: "Clássicos Históricos",
    query: "tempos modernos",
    exactTop1Movie: "Tempos Modernos",
    minResults: 1,
  },

  // 7. Higiene de Catálogo & Rejeição de Ruído
  {
    category: "Higiene de Catálogo",
    query: "avatar",
    exactTop1Movie: "Avatar",
    shouldNotInclude: ["Behind the Scenes", "Making of"],
  },
];

console.log("\n================================================================================");
console.log("       CINERA SEARCH ENGINE - AUDITORIA INDUSTRIAL DE PRECISÃO & LATÊNCIA       ");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;
let totalLatency = 0;
const failures: string[] = [];

for (const test of TEST_CASES) {
  process.stdout.write(`⏳ [${test.category}] "${test.query}"... `);

  try {
    // 1. Simulação opcional de digitação incremental (não afeta o cronômetro da busca final)
    if (test.simulateTyping) {
      for (let len = 2; len < test.query.length; len++) {
        const partial = test.query.substring(0, len);
        const { movies: partialMovies } = await searchWithTimeout(partial);
        if (partialMovies.length === 0) {
          throw new Error(`Digitação parcial "${partial}" falhou retornando 0 filmes (tela vazia prematura).`);
        }
      }
    }

    const startTime = Date.now();
    const { movies } = await searchWithTimeout(test.query);
    const elapsed = Date.now() - startTime;
    totalLatency += elapsed;

    if (!Array.isArray(movies) || movies.length === 0) {
      throw new Error(`Busca retornou 0 filmes (estado vazio prematuro para "${test.query}").`);
    }

    // Validação preventiva de integridade básica dos itens
    for (const movie of movies) {
      if (!movie || typeof movie.title !== "string" || !movie.title.trim()) {
        throw new Error(`Payload corrompido: filme sem título válido retornado.`);
      }
      if (!movie.posterPath) {
        throw new Error(`Filme "${movie.title}" violou a higiene de catálogo (veio sem imagem de pôster).`);
      }
      if (!movie.releaseDate) {
        throw new Error(`Filme "${movie.title}" violou a integridade de dados (veio sem data de lançamento).`);
      }
    }

    const normTitles = movies.map((m) => normalizeAssertString(m.title));

    // Validação: Mínimo de resultados
    if (test.minResults && movies.length < test.minResults) {
      throw new Error(`Esperava no mínimo ${test.minResults} resultados, recebeu ${movies.length}`);
    }

    // Validação: Top 1 Exato Obrigatório
    if (test.exactTop1Movie) {
      const expectedNorm = normalizeAssertString(test.exactTop1Movie);
      const top1Norm = normTitles[0] || "";
      if (!top1Norm.includes(expectedNorm)) {
        throw new Error(
          `Falha no Top 1 Obrigatório. Esperava: "${test.exactTop1Movie}", mas o primeiro foi: "${movies[0]?.title}"`
        );
      }
    }

    // Validação: Top 3 Esperado
    if (test.expectedTopMovies && test.expectedTopMovies.length > 0) {
      const top3Norm = normTitles.slice(0, 3);
      const hasMatch = test.expectedTopMovies.some((expected) => {
        const expNorm = normalizeAssertString(expected);
        return top3Norm.some((t) => t.includes(expNorm));
      });
      if (!hasMatch) {
        throw new Error(
          `Nenhum dos títulos esperados [${test.expectedTopMovies.join(", ")}] esteve no Top 3. Recebido: [${movies.slice(0, 3).map((m) => m.title).join(", ")}]`
        );
      }
    }

    // Validação: Inclusão obrigatória de todos os filmes da saga
    if (test.mustIncludeAll && test.mustIncludeAll.length > 0) {
      for (const required of test.mustIncludeAll) {
        const reqNorm = normalizeAssertString(required);
        const found = normTitles.some((t) => t.includes(reqNorm));
        if (!found) {
          throw new Error(`Filme obrigatório da saga "${required}" não constou na lista de retorno.`);
        }
      }
    }

    // Validação: Ordem cronológica da saga
    if (test.mustBeChronological && test.mustIncludeAll && test.mustIncludeAll.length > 0) {
      const canonicalSequence = [
        ...(test.exactTop1Movie ? [test.exactTop1Movie] : test.expectedTopMovies || []),
        ...test.mustIncludeAll,
      ];
      const positions = canonicalSequence.map((name) => {
        const targetNorm = normalizeAssertString(name);
        const idx = normTitles.findIndex((t) => t.includes(targetNorm));
        return { name, index: idx };
      }).filter((item) => item.index !== -1);

      for (let i = 0; i < positions.length - 1; i++) {
        if (positions[i].index > positions[i + 1].index) {
          throw new Error(
            `Quebra cronológica: "${positions[i].name}" (posição ${positions[i].index + 1}) veio depois de "${positions[i + 1].name}" (posição ${positions[i + 1].index + 1})`
          );
        }
      }
    }

    // Validação: Itens Proibidos (Making-of, ruído)
    if (test.shouldNotInclude && test.shouldNotInclude.length > 0) {
      for (const forbidden of test.shouldNotInclude) {
        const forbNorm = normalizeAssertString(forbidden);
        const found = normTitles.some((t) => t.includes(forbNorm));
        if (found) {
          throw new Error(`Item proibido/ruído "${forbidden}" apareceu na busca.`);
        }
      }
    }

    // Validação: Limite Máximo de Latência (SLA)
    if (test.maxLatencyMs !== undefined && elapsed > test.maxLatencyMs) {
      throw new Error(
        `Latência excedida. Limite SLA: ${test.maxLatencyMs}ms, observado: ${elapsed}ms`
      );
    }

    // Formatador de latência
    const latencyColor = elapsed < 400 ? "\x1b[32m" : elapsed < 800 ? "\x1b[33m" : "\x1b[31m";
    console.log(`\x1b[32m✅ PASS\x1b[0m (${movies.length} filmes, ${latencyColor}${elapsed}ms\x1b[0m)`);
    passedCount++;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`\x1b[31m❌ FAIL\x1b[0m`);
    failures.push(`[${test.category}] "${test.query}": ${errorMsg}`);
    failedCount++;
  }
}

const avgLatency = Math.round(totalLatency / TEST_CASES.length);

console.log("\n================================================================================");
console.log(`TOTAL DE TESTES EXECUTADOS: ${TEST_CASES.length}`);
console.log(`\x1b[32mTESTES APROVADOS: ${passedCount}\x1b[0m`);
console.log(`MÉDIA DE RESPOSTA POR BUSCA: ${avgLatency}ms`);

if (failedCount > 0) {
  console.log(`\x1b[31mFALHAS DETECTADAS: ${failedCount}\x1b[0m\n`);
  console.log("DIAGNÓSTICO DETALHADO:");
  failures.forEach((f, idx) => console.log(`${idx + 1}. ${f}`));
  console.log("================================================================================\n");
  process.exitCode = 1;
} else {
  console.log("\x1b[32mSUCESSO TOTAL! TODAS AS VALIDAÇÕES DE PRECISÃO INDUSTRIAL FORAM APROVADAS!\x1b[0m");
  console.log("================================================================================\n");
}
