import { useMemo } from "react";
import type { Movie } from "@/domain";
import { MovieCarousel } from "./MovieCarousel";
import { useCatalog } from "@/hooks/use-catalog";
import type { CatalogRowId } from "@/infrastructure/catalog/catalog-schema";
import { HOME_ROW_ORDER, assignHomeRows } from "@/infrastructure/catalog/home-assembly";
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
 * fileira, então o catálogo pode ser adotado aos poucos). Distribui os filmes entre as fileiras (assignHomeRows)
 * para nenhum filme se repetir entre elas nem com o destaque, e cada fileira feche o seu limite sempre que houver filmes.
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

    // Os filmes de cada fileira: os do catálogo curado ou, na falta dele, os da busca ao vivo
    const sources: Record<CatalogRowId, Movie[] | undefined> = {
      novidades: curated("novidades") ?? newData?.results,
      "em-alta": curated("em-alta") ?? trendingData?.results,
      aclamados: curated("aclamados") ?? topData?.results,
      classicos: curated("classicos") ?? classicsData?.results,
      populares: curated("populares") ?? popularData?.results,
    };
    // Garante unicidade de filmes entre as seções (e em relação ao destaque) e que cada uma feche o limite quando der
    const assigned = assignHomeRows<Movie>(
      HOME_ROW_ORDER.map((id) => ({ id, movies: sources[id] })),
      excludedKey ? excludedKey.split(",").map(Number) : [],
    );

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
        movies: assigned[id] ?? [],
        // Enquanto o catálogo carrega, a fileira espera: evita mostrar a busca ao vivo e trocar depois
        isLoading: isLoadingCatalog || (!fromCatalog && live.isLoading),
        isError: !fromCatalog && live.isError,
      };
    };

    return [
      // Novidades vem antes: fica com os grandes lançamentos do ano e Em Alta com o que sobra em tendência (e, se faltar, recebe filmes
      // que Novidades tem de sobra na própria lista: veja assignHomeRows)
      define("novidades", "Novidades", "✨", { results: newData?.results, isLoading: isLoadingNew, isError: isErrorNew }),
      define("em-alta", "Em Alta", "🔥", { results: trendingData?.results, isLoading: isLoadingTrending, isError: isErrorTrending }),
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
