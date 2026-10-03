import { useMemo } from "react";
import type { Movie } from "@/domain";
import { MovieCarousel } from "./MovieCarousel";
import { useCatalog } from "@/hooks/use-catalog";
import type { CatalogRowId } from "@/infrastructure/catalog/catalog-schema";
import {
  useTrendingMovies,
  useNewReleasesMovies,
  useTopRatedMovies,
  useClassicMovies,
  usePopularMovies,
} from "@/hooks/use-movies";

interface HomeFeedProps {
  /** Filmes que já aparecem no destaque e não devem se repetir nas fileiras */
  excludeIds?: number[];
  isFadingOut?: boolean;
  onSelectMovie?: (movie: Movie) => void;
}

/**
 * Feed principal da Home com os 5 carrosséis editoriais do Cinera.
 * Cada fileira vem do catálogo curado quando ele a possui; senão, da busca ao vivo (retorno por
 * fileira, então o catálogo pode ser adotado aos poucos). Aplica deduplicação em cascata (seenIds)
 * para nenhum filme se repetir entre as fileiras nem com o destaque.
 */
export function HomeFeed({ excludeIds, isFadingOut = false, onSelectMovie }: HomeFeedProps) {
  const { data: catalog, isLoading: isLoadingCatalog } = useCatalog();

  // A busca ao vivo só roda para fileiras que o catálogo curado não fornece
  const needsLive = (id: CatalogRowId) =>
    !isLoadingCatalog && !catalog?.rows.some((row) => row.id === id);

  const { data: trendingData, isLoading: isLoadingTrending, isError: isErrorTrending } = useTrendingMovies(1, needsLive("em-alta"));
  const { data: newData, isLoading: isLoadingNew, isError: isErrorNew } = useNewReleasesMovies(1, needsLive("novidades"));
  const { data: topData, isLoading: isLoadingTop, isError: isErrorTop } = useTopRatedMovies(1, needsLive("aclamados"));
  const { data: classicsData, isLoading: isLoadingClassics, isError: isErrorClassics } = useClassicMovies(1, needsLive("classicos"));
  const { data: popularData, isLoading: isLoadingPopular, isError: isErrorPopular } = usePopularMovies(1, needsLive("populares"));

  const excludedKey = (excludeIds ?? []).join(",");

  // Fileiras na ordem de exibição
  const sections = useMemo(() => {
    const curated = (id: CatalogRowId): Movie[] | undefined =>
      catalog?.rows.find((row) => row.id === id)?.movies;

    // Garante unicidade de filmes entre as seções (e em relação ao destaque)
    const seenIds = new Set<number>(excludedKey ? excludedKey.split(",").map(Number) : []);
    const dedupe = (list?: Movie[], limit: number = 20) => {
      if (!list) return [];
      const result: Movie[] = [];
      for (const m of list) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          result.push(m);
          if (result.length >= limit) break;
        }
      }
      return result;
    };

    const define = (
      id: CatalogRowId,
      title: string,
      icon: string,
      live: { results?: Movie[]; isLoading: boolean; isError: boolean },
    ) => {
      const fromCatalog = curated(id);
      return {
        title,
        icon,
        movies: dedupe(fromCatalog ?? live.results),
        // Enquanto o catálogo carrega, a fileira espera: evita mostrar a busca ao vivo e trocar depois
        isLoading: isLoadingCatalog || (!fromCatalog && live.isLoading),
        isError: !fromCatalog && live.isError,
      };
    };

    return [
      define("em-alta", "Em Alta", "🔥", { results: trendingData?.results, isLoading: isLoadingTrending, isError: isErrorTrending }),
      define("novidades", "Novidades", "✨", { results: newData?.results, isLoading: isLoadingNew, isError: isErrorNew }),
      define("aclamados", "Aclamados pela Crítica", "⭐", { results: topData?.results, isLoading: isLoadingTop, isError: isErrorTop }),
      define("classicos", "Clássicos Indispensáveis", "🏆", { results: classicsData?.results, isLoading: isLoadingClassics, isError: isErrorClassics }),
      define("populares", "Populares no Brasil", "🇧🇷", { results: popularData?.results, isLoading: isLoadingPopular, isError: isErrorPopular }),
    ];
  }, [
    catalog,
    isLoadingCatalog,
    excludedKey,
    trendingData?.results,
    isLoadingTrending,
    isErrorTrending,
    newData?.results,
    isLoadingNew,
    isErrorNew,
    topData?.results,
    isLoadingTop,
    isErrorTop,
    classicsData?.results,
    isLoadingClassics,
    isErrorClassics,
    popularData?.results,
    isLoadingPopular,
    isErrorPopular,
  ]);

  return (
    <div
      className={`flex flex-col gap-5 md:gap-7 transition-opacity duration-300 ${
        isFadingOut
          ? "opacity-0 pointer-events-none"
          : "opacity-100 animate-in fade-in duration-500"
      }`}
    >
      {sections.map((section) => (
        <MovieCarousel
          key={section.title}
          title={section.title}
          icon={section.icon}
          movies={section.movies}
          isLoading={section.isLoading}
          isError={section.isError}
          isEager={true}
          onSelectMovie={onSelectMovie}
        />
      ))}
    </div>
  );
}
