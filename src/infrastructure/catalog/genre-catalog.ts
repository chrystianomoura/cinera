import { z } from "zod";
import type { Movie } from "@/domain";
import { GENRE_SLUGS, type GenreCategory } from "../../features/catalog/constants";
import { catalogMovieSchema } from "./catalog-schema";

/** Categoria curada (public/genres/<slug>.json), gerada pelos scripts em scripts/. */
export const genreCatalogSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  genre: z.string(),
  movies: z.array(catalogMovieSchema),
});

export type GenreCatalog = z.infer<typeof genreCatalogSchema>;

const FETCH_TIMEOUT_MS = 6000;
const cache = new Map<string, Promise<Movie[] | null>>();

function isCategory(name: string): name is GenreCategory {
  return name in GENRE_SLUGS;
}

/**
 * Lista curada de uma categoria, na ordem de exibição (os de maior peso primeiro).
 * Devolve null quando o arquivo não existe ou é inválido, e a Home volta à busca ao vivo.
 */
export function fetchGenreCatalog(name: string): Promise<Movie[] | null> {
  if (!isCategory(name)) return Promise.resolve(null);
  const cached = cache.get(name);
  if (cached) return cached;

  const request = (async (): Promise<Movie[] | null> => {
    try {
      const response = await fetch(`/genres/${GENRE_SLUGS[name]}.json`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) return null;
      const parsed = genreCatalogSchema.safeParse(await response.json());
      if (!parsed.success) {
        console.warn(`Categoria curada "${name}" inválida; usando a busca ao vivo.`, parsed.error.issues[0]);
        return null;
      }
      return parsed.data.movies;
    } catch {
      return null;
    }
  })();

  cache.set(name, request);
  // Falha não fica guardada: a próxima tentativa busca de novo
  void request.then((movies) => {
    if (movies === null) cache.delete(name);
  });
  return request;
}
