import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCineraMovies, type SearchMoviesResult } from "@/infrastructure/search/search-service";

export function useMovieSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 280);

    return () => clearTimeout(handler);
  }, [query]);

  const isEnabled = debouncedQuery.length >= 2;

  const searchQuery = useQuery<SearchMoviesResult>({
    queryKey: ["search", "movies", debouncedQuery],
    queryFn: ({ signal }) => searchCineraMovies(debouncedQuery, signal),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache em memória
    placeholderData: (previousData: SearchMoviesResult | undefined) => previousData,
  });

  return {
    results: isEnabled ? searchQuery.data?.movies ?? [] : [],
    correctedQuery: isEnabled ? searchQuery.data?.correctedQuery : undefined,
    isLoading: isEnabled && searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    refetch: searchQuery.refetch,
    debouncedQuery,
    hasSearched: isEnabled && !searchQuery.isLoading && !searchQuery.isError,
  };
}
