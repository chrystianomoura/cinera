import { z } from "zod";
import { classifyMovie } from "../../domain/classification";

/** Índice id do filme → categorias do Cinera, de todos os filmes do catálogo (public/categories.json). */
export const categoryIndexSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  categories: z.record(z.string(), z.array(z.string())),
});

export type CategoryIndex = Record<string, string[]>;

/** Lê o índice; devolve null se não existir ou for inválido (a classificação cai para só as tags do TMDB). */
export async function fetchCategoryIndex(): Promise<CategoryIndex | null> {
  try {
    const response = await fetch("/categories.json", { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const parsed = categoryIndexSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.categories : null;
  } catch {
    return null;
  }
}

interface ClassifiableMovie {
  id: number;
  categories?: string[];
  genres?: { name: string }[];
}

/**
 * Categorias de um filme, iguais na pesquisa, nas listas e na ficha:
 * 1. as do catálogo (calculadas no build com TMDB e IMDb), pelo próprio filme ou pelo índice;
 * 2. para filmes fora do catálogo, a mesma classificação só com as tags do TMDB (a única fonte que a pesquisa
 *    e a ficha têm para todos os filmes, o que mantém os dois lugares concordando).
 */
export function resolveCategories(movie: ClassifiableMovie, index: CategoryIndex | null | undefined): string[] {
  return movie.categories ?? index?.[String(movie.id)] ?? classifyMovie({ tmdbGenres: (movie.genres ?? []).map((g) => g.name) });
}
