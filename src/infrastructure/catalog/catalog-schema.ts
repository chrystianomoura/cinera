import { z } from "zod";

/** Fileiras da Home que o catálogo curado pode fornecer. */
export const CATALOG_ROW_IDS = ["em-alta", "novidades", "aclamados", "classicos", "populares"] as const;
export type CatalogRowId = (typeof CATALOG_ROW_IDS)[number];

const genreSchema = z.object({ id: z.number(), name: z.string() });

/** Filme do catálogo: só o necessário para cards, destaque e abertura da ficha. */
export const catalogMovieSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  originalTitle: z.string().optional(),
  overview: z.string(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  voteAverage: z.number(),
  voteCount: z.number(),
  popularity: z.number().optional(),
  releaseDate: z.string(),
  tagline: z.string().optional(),
  genres: z.array(genreSchema).optional(),
});

/**
 * Catálogo curado (public/catalog.json), gerado pelos scripts em scripts/.
 * Qualquer fileira ausente continua vindo da busca ao vivo; o destaque (hero) só existe quando
 * as cinco fileiras estão curadas.
 */
export const catalogSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  hero: z.array(catalogMovieSchema).optional(),
  rows: z.array(
    z.object({
      id: z.enum(CATALOG_ROW_IDS),
      movies: z.array(catalogMovieSchema),
    }),
  ),
});

export type Catalog = z.infer<typeof catalogSchema>;
