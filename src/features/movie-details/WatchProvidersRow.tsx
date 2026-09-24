import type { MovieWatchProviders, WatchProvider } from "@/domain";

interface WatchProvidersRowProps {
  providers?: MovieWatchProviders | null;
  isLoading?: boolean;
}

export function WatchProvidersRow({ providers, isLoading }: WatchProvidersRowProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
          Onde Assistir
        </h3>
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Prioriza plataformas por assinatura (flatrate), e se não houver, exibe compra/aluguel
  const streamingList: WatchProvider[] =
    providers?.flatrate && providers.flatrate.length > 0
      ? providers.flatrate
      : [
          ...(providers?.rent || []),
          ...(providers?.buy || []),
        ];

  // Remove duplicados de provedor
  const uniqueProviders: WatchProvider[] = [];
  const seen = new Set<number>();
  for (const p of streamingList) {
    if (!seen.has(p.providerId)) {
      seen.add(p.providerId);
      uniqueProviders.push(p);
    }
  }

  if (uniqueProviders.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
          Onde Assistir
        </h3>
        <p className="text-sm text-zinc-300">
          Disponibilidade em streaming sob demanda ou ainda não informada.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
        Onde Assistir
      </h3>

      <div className="flex flex-wrap items-center gap-3">
        {uniqueProviders.map((provider) => (
          <div
            key={provider.providerId}
            title={provider.providerName}
            className="group/provider relative flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-white/10 hover:border-white/25 transition-all duration-200 shadow-md backdrop-blur-md"
          >
            {provider.logoPath ? (
              <img
                src={`https://image.tmdb.org/t/p/original${provider.logoPath}`}
                alt={provider.providerName}
                className="w-8 h-8 rounded-xl object-cover shadow-sm flex-shrink-0"
              />
            ) : null}
            <span className="text-xs font-semibold text-zinc-200 group-hover/provider:text-white tracking-wide">
              {provider.providerName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
