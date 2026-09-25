/**
 * Formata a duração em minutos de um filme para o padrão abreviado (ex: "2h 49m" ou "45m").
 */
export function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formata valores financeiros em dólares para padrão abreviado legível em pt-BR (ex: "$ 237 milhões" ou "$ 2,92 bilhões").
 */
export function formatCurrencyUSD(amount?: number): string | null {
  if (!amount || amount <= 0) return null;

  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = billions.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
    return `$ ${formatted} ${billions >= 2 ? "bilhões" : "bilhão"}`;
  }

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `$ ${formatted} ${millions >= 2 ? "milhões" : "milhão"}`;
  }

  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    const formatted = thousands.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `$ ${formatted} mil`;
  }

  return `$ ${amount.toLocaleString("pt-BR")}`;
}

interface GenreItem {
  id?: number;
  name: string;
}

const GENRE_WEIGHTS: Record<string, number> = {
  "Drama": 10,
  "Ficção científica": 10,
  "Guerra": 10,
  "Terror": 10,
  "Crime": 9,
  "Suspense": 9,
  "Thriller": 9,
  "Ação": 8,
  "Aventura": 8,
  "Fantasia": 8,
  "Animação": 8,
  "História": 8,
  "Faroeste": 8,
  "Mistério": 7,
  "Romance": 7,
  "Comédia": 5,
  "Música": 4,
  "Família": 3,
  "Documentário": 2,
  "Cinema TV": 1,
};

/**
 * Curadoria inteligente de gêneros (Smart Duo):
 * Ordena os gêneros por peso semântico narrativo (corrigindo distorções do TMDB onde obras dramáticas vêm como comédia pura, ex: Forrest Gump, Parasita)
 * e retorna no máximo os 2 principais separados por barra elegante.
 */
export function formatCuratedGenres(genres?: GenreItem[]): string | null {
  if (!genres || genres.length === 0) return null;

  const validGenres = genres.filter((g) => Boolean(g.name?.trim()));
  if (validGenres.length === 0) return null;

  // Ordena por peso semântico decrescente, preservando estabilidade
  const sorted = [...validGenres].sort((a, b) => {
    const weightA = GENRE_WEIGHTS[a.name] ?? 6;
    const weightB = GENRE_WEIGHTS[b.name] ?? 6;
    return weightB - weightA;
  });

  // Pega no máximo os 2 primeiros gêneros curados
  const top2 = sorted.slice(0, 2).map((g) => g.name);
  return top2.join(" / ");
}
