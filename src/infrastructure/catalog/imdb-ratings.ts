import { z } from "zod";

/** Notas do IMDb dos filmes do catálogo (public/imdb.json), geradas pelo robô: IMDb ID → [nota, votos]. */
const imdbRatingsSchema = z.object({
  version: z.literal(1),
  ratings: z.record(z.string(), z.tuple([z.number(), z.number().nullable()])),
});

export type StaticImdbRatings = z.infer<typeof imdbRatingsSchema>["ratings"];

const FETCH_TIMEOUT_MS = 6000;
let cached: Promise<StaticImdbRatings | null> | null = null;

/** Carrega o arquivo uma vez por visita. Falha não fica guardada: a próxima ficha tenta de novo. */
export function fetchStaticImdbRatings(): Promise<StaticImdbRatings | null> {
  if (cached) return cached;
  const request = (async (): Promise<StaticImdbRatings | null> => {
    try {
      const response = await fetch("/imdb.json", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) return null;
      const parsed = imdbRatingsSchema.safeParse(await response.json());
      return parsed.success ? parsed.data.ratings : null;
    } catch {
      return null;
    }
  })();
  cached = request;
  void request.then((ratings) => {
    if (ratings === null) cached = null;
  });
  return request;
}

/** Nota e votos (votos no formato do OMDb, "18,537") de um filme do catálogo; null se não estiver nele. */
export async function staticImdbRating(imdbId: string): Promise<{ rating: string; votes?: string } | null> {
  const entry = (await fetchStaticImdbRatings())?.[imdbId];
  if (!entry) return null;
  const [rating, votes] = entry;
  return { rating: rating.toFixed(1), votes: votes === null ? undefined : votes.toLocaleString("en-US") };
}
