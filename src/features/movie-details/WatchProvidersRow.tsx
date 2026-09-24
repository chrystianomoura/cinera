import type { MovieWatchProviders, WatchProvider } from "@/domain";

interface WatchProvidersRowProps {
  providers?: MovieWatchProviders | null;
  isLoading?: boolean;
  movieTitle?: string;
}

/**
 * Normaliza e consolida marcas de streaming para evitar repetições redundantes
 * (ex: elimina clones como "Amazon Channel", "with Ads", "Premium", unificando na marca principal).
 */
function getBrandInfo(rawName: string): { brandKey: string; displayName: string } {
  const lower = rawName.toLowerCase();

  if (lower.includes("netflix")) {
    return { brandKey: "netflix", displayName: "Netflix" };
  }
  if (lower.includes("paramount")) {
    return { brandKey: "paramount", displayName: "Paramount+" };
  }
  if (lower.includes("disney")) {
    return { brandKey: "disney", displayName: "Disney+" };
  }
  if (lower.includes("star+") || lower.includes("star plus")) {
    return { brandKey: "star_plus", displayName: "Star+" };
  }
  if (lower.includes("hbo max") || lower.includes("max")) {
    return { brandKey: "max", displayName: "Max" };
  }
  if (lower.includes("telecine")) {
    return { brandKey: "telecine", displayName: "Telecine" };
  }
  if (lower.includes("globoplay")) {
    return { brandKey: "globoplay", displayName: "Globoplay" };
  }
  if (lower.includes("prime video") || lower.includes("amazon prime") || lower.includes("amazon video")) {
    return { brandKey: "prime_video", displayName: "Prime Video" };
  }
  if (lower.includes("apple tv") || lower.includes("itunes")) {
    return { brandKey: "apple_tv", displayName: "Apple TV+" };
  }
  if (lower.includes("mubi")) {
    return { brandKey: "mubi", displayName: "MUBI" };
  }
  if (lower.includes("claro")) {
    return { brandKey: "claro", displayName: "Claro tv+" };
  }
  if (lower.includes("vivo")) {
    return { brandKey: "vivo", displayName: "Vivo Play" };
  }
  if (lower.includes("crunchyroll")) {
    return { brandKey: "crunchyroll", displayName: "Crunchyroll" };
  }
  if (lower.includes("looke")) {
    return { brandKey: "looke", displayName: "Looke" };
  }
  if (lower.includes("oldflix")) {
    return { brandKey: "oldflix", displayName: "Oldflix" };
  }
  if (lower.includes("belas artes") || lower.includes("a la carte")) {
    return { brandKey: "belas_artes", displayName: "Belas Artes À La Carte" };
  }
  if (lower.includes("reserva imovision")) {
    return { brandKey: "reserva_imovision", displayName: "Reserva Imovision" };
  }
  if (lower.includes("filmicca")) {
    return { brandKey: "filmicca", displayName: "Filmicca" };
  }
  if (lower.includes("pluto")) {
    return { brandKey: "pluto", displayName: "Pluto TV" };
  }
  if (lower.includes("mercado play")) {
    return { brandKey: "mercado_play", displayName: "Mercado Play" };
  }
  if (lower.includes("youtube")) {
    return { brandKey: "youtube", displayName: "YouTube" };
  }
  if (lower.includes("google play")) {
    return { brandKey: "google_play", displayName: "Google Play" };
  }

  // Genérico: remove sufixos de canais ou planos secundários
  const cleanName = rawName
    .replace(/\s+amazon\s+channel/i, "")
    .replace(/\s+apple\s+tv\s+channel/i, "")
    .replace(/\s+with\s+ads/i, "")
    .replace(/\s+basic\s+with\s+ads/i, "")
    .replace(/\s+standard\s+with\s+ads/i, "")
    .replace(/\s+premium/i, "")
    .replace(/\s*\+\s*canais\s+ao\s+vivo/i, "")
    .trim();

  return { brandKey: cleanName.toLowerCase(), displayName: cleanName };
}

const STREAMING_HOMEPAGES: Record<string, string> = {
  netflix: "https://www.netflix.com/",
  max: "https://www.max.com/",
  disney: "https://www.disneyplus.com/",
  star_plus: "https://www.disneyplus.com/",
  paramount: "https://www.paramountplus.com/",
  prime_video: "https://www.primevideo.com/",
  globoplay: "https://globoplay.globo.com/",
  telecine: "https://globoplay.globo.com/telecine/",
  apple_tv: "https://tv.apple.com/",
  mubi: "https://mubi.com/",
  claro: "https://www.clarotvmais.com.br/",
  vivo: "https://vivoplay.com.br/",
  crunchyroll: "https://www.crunchyroll.com/",
  looke: "https://www.looke.com.br/",
  oldflix: "https://www.oldflix.com.br/",
  belas_artes: "https://www.belasartesalacarte.com.br/",
  reserva_imovision: "https://reservaimovision.com.br/",
  filmicca: "https://filmicca.com.br/",
  pluto: "https://pluto.tv/",
  mercado_play: "https://www.mercadolivre.com.br/play",
  youtube: "https://www.youtube.com/",
  google_play: "https://play.google.com/store/movies",
};

/**
 * Retorna o link oficial da página inicial do serviço de streaming correspondente
 */
function getStreamingHomeUrl(brandKey: string): string | null {
  return STREAMING_HOMEPAGES[brandKey] || null;
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
              className="w-12 h-10 rounded-2xl bg-zinc-900 border border-white/5 animate-pulse"
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

  // Remove clones e variações de canais/planos agrupando na marca principal
  const uniqueProviders: Array<
    WatchProvider & { cleanName: string; homeUrl: string | null }
  > = [];
  const seenBrands = new Set<string>();

  for (const p of streamingList) {
    const { brandKey, displayName } = getBrandInfo(p.providerName);
    if (!seenBrands.has(brandKey)) {
      seenBrands.add(brandKey);
      const homeUrl = getStreamingHomeUrl(brandKey);
      uniqueProviders.push({
        ...p,
        cleanName: displayName,
        homeUrl,
      });
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
    <div className="flex flex-col gap-2.5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
        Onde Assistir
      </h3>

      <div className="flex flex-wrap items-center gap-2.5">
        {uniqueProviders.map((provider) => {
          const content = (
            <>
              {provider.logoPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/original${provider.logoPath}`}
                  alt={provider.cleanName}
                  className="w-7 h-7 rounded-xl object-cover shadow-sm flex-shrink-0"
                />
              ) : null}
              <span className="text-xs font-semibold text-zinc-200 group-hover/provider:text-white tracking-wide transition-colors">
                {provider.cleanName}
              </span>
            </>
          );

          if (provider.homeUrl) {
            return (
              <a
                key={provider.providerId}
                href={provider.homeUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Acessar home do ${provider.cleanName} (Abre em nova aba)`}
                className="group/provider relative flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/30 transition-all duration-200 shadow-md backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={provider.providerId}
              title={provider.cleanName}
              className="group/provider relative flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-md backdrop-blur-md"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
