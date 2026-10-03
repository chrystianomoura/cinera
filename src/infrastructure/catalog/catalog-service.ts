import { catalogSchema, type Catalog } from "./catalog-schema";

/**
 * Lê o catálogo curado. Devolve null quando o arquivo não existe (hospedagens costumam responder
 * com a página inicial) ou está inválido, para a Home voltar à busca ao vivo sem quebrar.
 */
export async function fetchCatalog(): Promise<Catalog | null> {
  try {
    const response = await fetch("/catalog.json", { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const parsed = catalogSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.warn("catalog.json inválido, usando a busca ao vivo:", parsed.error.issues.slice(0, 3));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
