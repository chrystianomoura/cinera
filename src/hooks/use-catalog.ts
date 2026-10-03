import { useQuery } from "@tanstack/react-query";
import { fetchCatalog } from "@/infrastructure/catalog/catalog-service";
import type { Catalog } from "@/infrastructure/catalog/catalog-schema";

/** Catálogo curado (ou null quando indisponível). Arquivo estático pequeno: cache longo e sem retentativa. */
export function useCatalog() {
  return useQuery<Catalog | null>({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
