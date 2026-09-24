import type { MovieWatchProviders, WatchProvider } from "@/domain";

interface WatchProvidersRowProps {
  providers?: MovieWatchProviders | null;
  isLoading?: boolean;
  movieTitle?: string;
}

/**
 * Normaliza e consolida marcas de streaming para evitar repetições redundantes
 * e falsas identificações (ex: elimina clones como "MGM+ Apple TV Channel",
 * "Paramount+ Amazon Channel", "with Ads", unificando na marca principal real).
 */
function getBrandInfo(rawName: string): { brandKey: string; displayName: string } {
  // 1. Remove sufixos de canais de distribuição e planos secundários ANTES de identificar a marca principal
  const cleanName = rawName
    .replace(/\s+(amazon|apple\s*tv|google\s*play)\s+channels?/i, "")
    .replace(/\s+(with\s+ads|basic\s+with\s+ads|standard\s+with\s+ads|premium)/i, "")
    .replace(/\s*\+\s*canais\s+ao\s+vivo/i, "")
    .replace(/\s+channel$/i, "")
    .trim();

  const lower = cleanName.toLowerCase();

  // 2. Mapeamento exaustivo das marcas do catálogo brasileiro (TMDB)
  if (lower.includes("netflix")) return { brandKey: "netflix", displayName: "Netflix" };
  if (lower.includes("mgm")) return { brandKey: "mgm", displayName: "MGM+" };
  if (lower.includes("diamond")) return { brandKey: "diamond_films", displayName: "Diamond Films" };
  if (lower.includes("paramount")) return { brandKey: "paramount", displayName: "Paramount+" };
  if (lower.includes("disney")) return { brandKey: "disney", displayName: "Disney+" };
  if (lower.includes("star+") || lower.includes("star plus")) return { brandKey: "star_plus", displayName: "Star+" };
  if (lower.includes("hbo max") || lower.includes("max")) return { brandKey: "max", displayName: "HBO Max" };
  if (lower.includes("telecine")) return { brandKey: "telecine", displayName: "Telecine" };
  if (lower.includes("globoplay")) return { brandKey: "globoplay", displayName: "Globoplay" };
  if (lower.includes("multishow")) return { brandKey: "multishow", displayName: "Multishow" };
  if (lower.includes("gloob")) return { brandKey: "gloob", displayName: "Gloob" };
  if (lower.includes("canal brasil")) return { brandKey: "canal_brasil", displayName: "Canal Brasil" };
  if (lower.includes("prime video") || lower.includes("amazon prime") || lower.includes("amazon video")) return { brandKey: "prime_video", displayName: "Prime Video" };
  if (lower.includes("apple tv") || lower.includes("itunes")) return { brandKey: "apple_tv", displayName: "Apple TV+" };
  if (lower.includes("lionsgate") || lower.includes("starz")) return { brandKey: "lionsgate", displayName: "Lionsgate+" };
  if (lower.includes("universal")) return { brandKey: "universal", displayName: "Universal+" };
  if (lower.includes("adrenalina pura")) return { brandKey: "adrenalina_pura", displayName: "Adrenalina Pura" };
  if (lower.includes("mubi")) return { brandKey: "mubi", displayName: "MUBI" };
  if (lower.includes("claro")) return { brandKey: "claro", displayName: "Claro tv+" };
  if (lower.includes("vivo")) return { brandKey: "vivo", displayName: "Vivo Play" };
  if (lower.includes("crunchyroll")) return { brandKey: "crunchyroll", displayName: "Crunchyroll" };
  if (lower.includes("looke")) return { brandKey: "looke", displayName: "Looke" };
  if (lower.includes("oldflix")) return { brandKey: "oldflix", displayName: "Oldflix" };
  if (lower.includes("belas artes") || lower.includes("a la carte")) return { brandKey: "belas_artes", displayName: "Belas Artes À La Carte" };
  if (lower.includes("reserva imovision")) return { brandKey: "reserva_imovision", displayName: "Reserva Imovision" };
  if (lower.includes("filmicca")) return { brandKey: "filmicca", displayName: "Filmicca" };
  if (lower.includes("netmovies")) return { brandKey: "netmovies", displayName: "NetMovies" };
  if (lower.includes("libreflix")) return { brandKey: "libreflix", displayName: "Libreflix" };
  if (lower.includes("plex")) return { brandKey: "plex", displayName: "Plex" };
  if (lower.includes("pluto")) return { brandKey: "pluto", displayName: "Pluto TV" };
  if (lower.includes("mercado play")) return { brandKey: "mercado_play", displayName: "Mercado Play" };
  if (lower.includes("curtaon")) return { brandKey: "curtaon", displayName: "CurtaOn" };
  if (lower.includes("univer video")) return { brandKey: "univer_video", displayName: "Univer Vídeo" };
  if (lower.includes("tv brasil")) return { brandKey: "tv_brasil", displayName: "TV Brasil Play" };
  if (lower.includes("box brazil")) return { brandKey: "box_brazil", displayName: "Box Brazil Play" };
  if (lower.includes("sony one") || lower.includes("sony")) return { brandKey: "sony", displayName: "Sony One" };
  if (lower.includes("filmelier")) return { brandKey: "filmelier", displayName: "Filmelier+" };
  if (lower.includes("stingray")) return { brandKey: "stingray", displayName: "Stingray" };
  if (lower.includes("discovery kids")) return { brandKey: "discovery_kids", displayName: "Discovery Kids" };
  if (lower.includes("love nature")) return { brandKey: "love_nature", displayName: "Love Nature" };
  if (lower.includes("cultpix")) return { brandKey: "cultpix", displayName: "Cultpix" };
  if (lower.includes("filmbox")) return { brandKey: "filmbox", displayName: "FilmBox+" };
  if (lower.includes("takflix")) return { brandKey: "takflix", displayName: "Takflix" };
  if (lower.includes("sun nxt")) return { brandKey: "sun_nxt", displayName: "Sun NXT" };
  if (lower.includes("runtime")) return { brandKey: "runtime", displayName: "Runtime" };
  if (lower.includes("shahid")) return { brandKey: "shahid", displayName: "Shahid VIP" };
  if (lower.includes("jolt")) return { brandKey: "jolt", displayName: "Jolt Film" };
  if (lower.includes("found tv")) return { brandKey: "found_tv", displayName: "FOUND TV" };
  if (lower.includes("kocowa")) return { brandKey: "kocowa", displayName: "KOCOWA+" };
  if (lower.includes("bloodstream")) return { brandKey: "bloodstream", displayName: "Bloodstream" };
  if (lower.includes("movieme")) return { brandKey: "movieme", displayName: "MovieMe" };
  if (lower.includes("kableone")) return { brandKey: "kableone", displayName: "KableOne" };
  if (lower.includes("arte")) return { brandKey: "arte", displayName: "Arte" };
  if (lower.includes("aquarius")) return { brandKey: "aquarius", displayName: "Aquarius" };
  if (lower.includes("booh")) return { brandKey: "booh", displayName: "Booh" };
  if (lower.includes("caixaforum")) return { brandKey: "caixaforum", displayName: "CaixaForum+" };
  if (lower.includes("artiflix")) return { brandKey: "artiflix", displayName: "Artiflix" };
  if (lower.includes("artify")) return { brandKey: "artify", displayName: "Artify" };
  if (lower.includes("koiplay")) return { brandKey: "koiplay", displayName: "Koiplay" };
  if (lower.includes("pijama")) return { brandKey: "pijama_films", displayName: "Pijama Films" };
  if (lower.includes("cindie")) return { brandKey: "cindie", displayName: "Cindie" };
  if (lower.includes("filmtap")) return { brandKey: "filmtap", displayName: "Filmtap" };
  if (lower.includes("justwatch")) return { brandKey: "justwatch", displayName: "JustWatch" };
  if (lower.includes("curiosity stream")) return { brandKey: "curiosity_stream", displayName: "Curiosity Stream" };
  if (lower.includes("revry")) return { brandKey: "revry", displayName: "Revry" };
  if (lower.includes("docsville")) return { brandKey: "docsville", displayName: "DOCSVILLE" };
  if (lower.includes("gospel play")) return { brandKey: "gospel_play", displayName: "Gospel Play" };
  if (lower.includes("wow presents")) return { brandKey: "wow_presents", displayName: "WOW Presents Plus" };
  if (lower.includes("magellan")) return { brandKey: "magellan", displayName: "MagellanTV" };
  if (lower.includes("broadwayhd")) return { brandKey: "broadwayhd", displayName: "BroadwayHD" };
  if (lower.includes("filmzie")) return { brandKey: "filmzie", displayName: "Filmzie" };
  if (lower.includes("moviesaints")) return { brandKey: "moviesaints", displayName: "MovieSaints" };
  if (lower.includes("dekkoo")) return { brandKey: "dekkoo", displayName: "Dekkoo" };
  if (lower.includes("true story")) return { brandKey: "true_story", displayName: "True Story" };
  if (lower.includes("docalliance")) return { brandKey: "docalliance", displayName: "DocAlliance Films" };
  if (lower.includes("hoichoi")) return { brandKey: "hoichoi", displayName: "Hoichoi" };
  if (lower.includes("eventive")) return { brandKey: "eventive", displayName: "Eventive" };
  if (lower.includes("youtube")) return { brandKey: "youtube", displayName: "YouTube" };
  if (lower.includes("google play")) return { brandKey: "google_play", displayName: "Google Play" };

  return { brandKey: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_"), displayName: cleanName };
}

const STREAMING_HOMEPAGES: Record<string, string> = {
  // Principais plataformas com operação direta e faturamento no Brasil
  netflix: "https://www.netflix.com/br/",
  max: "https://www.max.com/br/pt",
  disney: "https://www.disneyplus.com/pt-br",
  star_plus: "https://www.disneyplus.com/pt-br",
  paramount: "https://www.paramountplus.com/br/",
  prime_video: "https://www.primevideo.com/",
  globoplay: "https://globoplay.globo.com/",
  telecine: "https://globoplay.globo.com/telecine/",
  apple_tv: "https://tv.apple.com/br",
  universal: "https://universalplus.com.br/",
  mgm: "https://www.mgmplus.com/",
  diamond_films: "https://diamondfilms.com.br/",
  claro: "https://www.clarotvmais.com.br/",
  vivo: "https://vivoplay.com.br/",
  crunchyroll: "https://www.crunchyroll.com/pt-br/",
  looke: "https://www.looke.com.br/",
  oldflix: "https://www.oldflix.com.br/",
  belas_artes: "https://www.belasartesalacarte.com.br/",
  reserva_imovision: "https://reservaimovision.com.br/",
  filmicca: "https://filmicca.com.br/",
  mubi: "https://mubi.com/pt/br",
  pluto: "https://pluto.tv/br/",
  mercado_play: "https://www.mercadolivre.com.br/play",
  youtube: "https://www.youtube.com/feed/storefront",
  google_play: "https://www.youtube.com/feed/storefront",
  lionsgate: "https://www.lionsgate.com/",
  adrenalina_pura: "https://www.adrenalinapura.com/",
  netmovies: "https://www.netmovies.com.br/",
  libreflix: "https://libreflix.org/",
  plex: "https://www.plex.tv/pt/",
  curtaon: "https://www.curtaon.com.br/",
  univer_video: "https://www.univervideo.com/",
  tv_brasil: "https://play.ebc.com.br/",
  box_brazil: "https://www.boxbrazilplay.com.br/",
  sony: "https://www.sonypictures.com.br/",
  multishow: "https://globoplay.globo.com/multishow/",
  gloob: "https://globoplay.globo.com/gloob/",
  canal_brasil: "https://canaisglobo.globo.com/c/canal-brasil/",
  filmelier: "https://www.filmelier.com/",
  discovery_kids: "https://www.discoverykidsplus.com.br/",
  gospel_play: "https://gospelplay.com/",

  // Canais agregados distribuídos e contratados no Brasil pelo Prime Video Channels
  love_nature: "https://www.primevideo.com/",
  stingray: "https://www.primevideo.com/",
  cindie: "https://www.primevideo.com/",
  koiplay: "https://www.primevideo.com/",
  aquarius: "https://www.primevideo.com/",
  arte: "https://www.primevideo.com/",
  booh: "https://www.primevideo.com/",
  runtime: "https://www.runtime.tv/",
};

const BRAND_LOGOS: Record<string, string> = {
  lionsgate: "/providers/lionsgate.png",
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

  // Remove clones e variações de canais/planos, mantendo APENAS serviços com assinatura ativa no Brasil
  const uniqueProviders: Array<
    WatchProvider & { cleanName: string; homeUrl: string; logoUrl: string | null }
  > = [];
  const seenBrands = new Set<string>();

  for (const p of streamingList) {
    const { brandKey, displayName } = getBrandInfo(p.providerName);
    const homeUrl = getStreamingHomeUrl(brandKey);

    // Se a plataforma não tem assinatura/operação direta no Brasil, não exibe o badge
    if (!homeUrl) {
      continue;
    }

    if (!seenBrands.has(brandKey)) {
      seenBrands.add(brandKey);
      const logoUrl =
        BRAND_LOGOS[brandKey] ||
        (p.logoPath ? `https://image.tmdb.org/t/p/original${p.logoPath}` : null);

      uniqueProviders.push({
        ...p,
        cleanName: displayName,
        homeUrl,
        logoUrl,
      });
    }
  }

  if (uniqueProviders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 pt-2">
      <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
        Onde Assistir
      </h3>

      <div className="flex flex-wrap items-center gap-2.5">
        {uniqueProviders.map((provider) => {
          const content = (
            <>
              {provider.logoUrl ? (
                <img
                  src={provider.logoUrl}
                  alt={provider.cleanName}
                  className="w-7 h-7 rounded-xl object-cover shadow-sm flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 flex-shrink-0 shadow-sm">
                  {provider.cleanName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-200 group-hover/provider:text-white tracking-wide transition-colors">
                {provider.cleanName}
              </span>
            </>
          );

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
        })}
      </div>
    </div>
  );
}
