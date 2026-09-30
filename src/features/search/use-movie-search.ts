import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCineraMovies, SEARCH_CONFIG, type SearchMoviesResult } from "@/infrastructure/search/search-service";

export function useMovieSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 280);

    return () => clearTimeout(handler);
  }, [query]);

  const isEnabled = debouncedQuery.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH;

  const searchQuery = useQuery<SearchMoviesResult>({
    queryKey: ["search", "movies", debouncedQuery],
    queryFn: ({ signal }) => searchCineraMovies(debouncedQuery, signal),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache em memória
    // Mantém o placeholder suave apenas enquanto o usuário estiver estendendo incrementalmente a digitação
    placeholderData: (previousData, previousQuery) => {
      const prevTerm = previousQuery?.queryKey[2];
      return typeof prevTerm === "string" && debouncedQuery.startsWith(prevTerm)
        ? previousData
        : undefined;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  const isPlaceholderData = searchQuery.isPlaceholderData;
  const isSettled =
    query.trim() === debouncedQuery &&
    !isPlaceholderData &&
    !searchQuery.isFetching &&
    !searchQuery.isError;

  return {
    results: isEnabled ? searchQuery.data?.movies ?? [] : [],
    // isLoading ativo apenas no primeiro carregamento sem dados em cache (preserva stale-while-revalidate suave)
    isLoading: isEnabled && searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isPlaceholderData,
    isSettled,
    isError: searchQuery.isError,
    refetch: searchQuery.refetch,
    debouncedQuery,
    // hasSearched ativo apenas quando a requisição terminou completamente sem erro, suprimindo falsos 'Nenhum resultado'
    hasSearched:
      isEnabled &&
      !searchQuery.isLoading &&
      !searchQuery.isFetching &&
      !isPlaceholderData &&
      !searchQuery.isError,
  };
}