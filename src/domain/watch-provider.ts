/**
 * Representa um provedor de streaming, compra ou aluguel de filmes.
 */
export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath: string;
  displayPriority: number;
}

/**
 * Agrupa as diferentes opções onde um filme está disponível.
 */
export interface MovieWatchProviders {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}
