import { useQuery } from "@tanstack/react-query";
import { fetchCategoryIndex, type CategoryIndex } from "@/infrastructure/catalog/category-index";

/** Índice de categorias do catálogo (ou null). Arquivo estático pequeno, buscado uma vez. */
export function useCategoryIndex() {
  return useQuery<CategoryIndex | null>({
    queryKey: ["category-index"],
    queryFn: fetchCategoryIndex,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
