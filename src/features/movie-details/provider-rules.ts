import type { WatchProvider } from "@/domain";

// Regras de domínio dos provedores de streaming (sem React): transformam a lista bruta do TMDB em marcas
// brasileiras consolidadas, com link oficial, logo e a indicação de canal extra.

/**
 * Normaliza e consolida marcas de streaming para evitar repetições redundantes
 * e falsas identificações (ex: elimina clones como "MGM+ Apple TV Channel",
 * "Paramount+ Amazon Channel", "with Ads", unificando na marca principal real).
 */
export function getBrandInfo(rawName: string): { brandKey: string; displayName: string } {
  // 1. Remove sufixos de canais de distribuição e planos secundários ANTES de identificar a marca principal
  const cleanName = rawName
    .replace(/\s+(amazon|apple\s*tv|google\s*play)\s+channels?/i, "")
    .replace(/\s+(with\s+ads|basic\s+with\s+ads|standard\s+with\s+ads|premium)/i, "")
    .replace(/\s*\+\s*canais\s+ao\s+vivo/i, "")
    .replace(/\s+channel$/i, "")
    .trim();

  const lower = cleanName.toLowerCase();

  // 2. Mapeamento exaustivo das marcas do catálogo brasileiro (TMDB) com limites de palavra em termos curtos
  if (lower.includes("netflix")) return { brandKey: "netflix", displayName: "Netflix" };
  if (/\bmgm\b/.test(lower)) return { brandKey: "mgm", displayName: "MGM+" };
  if (lower.includes("diamond")) return { brandKey: "diamond_films", displayName: "Diamond Films" };
  if (lower.includes("paramount")) return { brandKey: "paramount", displayName: "Paramount+" };
  if (lower.includes("disney") || lower.includes("star+") || lower.includes("star plus")) return { brandKey: "disney", displayName: "Disney+" };
  if (/\b(hbo\s*max|max)\b/.test(lower)) return { brandKey: "max", displayName: "HBO Max" };
  if (lower.includes("telecine")) return { brandKey: "telecine", displayName: "Telecine" };
  if (lower.includes("globoplay")) return { brandKey: "globoplay", displayName: "Globoplay" };
  if (lower.includes("multishow")) return { brandKey: "multishow", displayName: "Multishow" };
  if (lower.includes("gloob")) return { brandKey: "gloob", displayName: "Gloob" };
  if (lower.includes("canal brasil")) return { brandKey: "canal_brasil", displayName: "Canal Brasil" };
  if (lower.includes("prime video") || lower.includes("amazon prime") || lower.includes("amazon video")) return { brandKey: "prime_video", displayName: "Prime Video" };
  if (lower.includes("apple tv") || lower.includes("itunes")) return { brandKey: "apple_tv", displayName: "Apple TV" };
  if (lower.includes("universal")) return { brandKey: "universal", displayName: "Universal+" };
  if (lower.includes("adrenalina pura")) return { brandKey: "adrenalina_pura", displayName: "Adrenalina Pura" };
  if (lower.includes("mubi")) return { brandKey: "mubi", displayName: "MUBI" };
  if (lower.includes("claro")) return { brandKey: "claro", displayName: "Claro tv+" };
  if (/\bvivo\b/.test(lower)) return { brandKey: "vivo", displayName: "Vivo TV" };
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
  if (/\b(sony\s*one|sony)\b/.test(lower)) return { brandKey: "sony", displayName: "Sony One" };
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
  if (/\barte\b/.test(lower)) return { brandKey: "arte", displayName: "Arte" };
  if (lower.includes("aquarius")) return { brandKey: "aquarius", displayName: "Aquarius" };
  if (/\bbooh\b/.test(lower)) return { brandKey: "booh", displayName: "Booh" };
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
  if (lower.includes("youtube") || lower.includes("google play") || lower.includes("google tv")) return { brandKey: "youtube", displayName: "YouTube" };

  return { brandKey: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_"), displayName: cleanName };
}

const STREAMING_HOMEPAGES: Record<string, string> = {
  // Principais plataformas com operação direta e faturamento no Brasil
  netflix: "https://www.netflix.com/br/",
  max: "https://www.max.com/br/pt",
  disney: "https://www.disneyplus.com/pt-br",
  paramount: "https://www.paramountplus.com/br/",
  prime_video: "https://www.primevideo.com/",
  globoplay: "https://globoplay.globo.com/",
  telecine: "https://globoplay.globo.com/telecine/",
  apple_tv: "https://tv.apple.com/br",
  universal: "https://universalplus.com.br/",
  mgm: "https://www.mgmplus.com/",
  diamond_films: "https://diamondfilms.com.br/",
  claro: "https://www.clarotvmais.com.br/",
  vivo: "https://www.vivotv.com.br/",
  crunchyroll: "https://www.crunchyroll.com/pt-br/",
  looke: "https://www.looke.com.br/",
  oldflix: "https://www.oldflix.com.br/",
  belas_artes: "https://www.belasartesalacarte.com.br/",
  reserva_imovision: "https://reservaimovision.com.br/",
  filmicca: "https://filmicca.com.br/",
  mubi: "https://mubi.com/pt/br",
  pluto: "https://pluto.tv/br/",
  mercado_play: "https://play.mercadolivre.com.br/",
  youtube: "https://www.youtube.com/feed/storefront",
  adrenalina_pura: "https://www.adrenalinapura.com/",
  netmovies: "https://www.netmovies.com.br/",
  libreflix: "https://libreflix.org/",
  plex: "https://www.plex.tv/pt/",
  curtaon: "https://www.curtaon.com.br/",
  univer_video: "https://www.univervideo.com/",
  tv_brasil: "https://play.ebc.com.br/",
  box_brazil: "https://www.boxbrazilplay.com.br/",
  sony: "https://sonyone.com.br/",
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

/**
 * Logos oficiais das marcas (ícones publicados pelos próprios serviços), servidos de /providers.
 * Têm prioridade sobre o logo do TMDB, que varia de estilo e traz variantes de "canal".
 */
const LOCAL_LOGO_KEYS = new Set([
  "apple_tv",
  "belas_artes",
  "claro",
  "crunchyroll",
  "diamond_films",
  "disney",
  "filmelier",
  "filmicca",
  "globoplay",
  "gospel_play",
  "libreflix",
  "looke",
  "mercado_play",
  "mubi",
  "multishow",
  "oldflix",
  "paramount",
  "plex",
  "pluto",
  "prime_video",
  "sony",
  "univer_video",
  "universal",
  "vivo",
]);

/** Marcas sem arquivo local que precisam de um logo específico do TMDB. */
const BRAND_LOGOS: Record<string, string> = {
  youtube: "https://image.tmdb.org/t/p/original/5Maob4o5w8oZnNeYpCDyVFD3M7X.png",
};

/**
 * Retorna o link oficial da página inicial do serviço de streaming correspondente
 */
function getStreamingHomeUrl(brandKey: string): string | null {
  return STREAMING_HOMEPAGES[brandKey] || null;
}

export type ProcessedProvider = WatchProvider & {
  brandKey: string;
  cleanName: string;
  homeUrl: string;
  logoUrl: string | null;
  /** Só existe como canal vendido dentro do serviço (Amazon/Apple TV): exige assinatura extra */
  requiresAddon: boolean;
  /** Explicação do canal extra para o tooltip (ex.: "via canal Telecine"), ou null */
  addonNote: string | null;
};

/** Serviços que vendem canais de terceiros dentro deles (ex.: "Telecine Amazon Channel"). */
const CHANNEL_HOSTS = [
  { pattern: /\s+amazon\s+channels?\s*$/i, hostKey: "prime_video", hostName: "Prime Video" },
  { pattern: /\s+apple\s*tv\s+channels?\s*$/i, hostKey: "apple_tv", hostName: "Apple TV" },
  { pattern: /\s+google\s*play\s+channels?\s*$/i, hostKey: "youtube", hostName: "YouTube" },
];

/**
 * Marcas com logo oficial aprovado que, no Brasil, só chegam por canal da Amazon/Apple TV:
 * mantêm o próprio nome e logo, com o aviso de canal extra (as demais viram o serviço que as vende).
 */
const KEEP_OWN_IDENTITY_KEYS = new Set([
  "diamond_films",
  "filmelier",
  "multishow",
  "sony",
  "universal",
]);

/**
 * Dentre as marcas acima, as que também têm assinatura direta no Brasil: o TMDB as lista como
 * canal, mas o usuário pode assinar direto, então não recebem o aviso de canal extra.
 */
const DIRECT_SUBSCRIPTION_KEYS = new Set(["universal"]);

/** Se o provedor é um canal dentro de outro serviço, devolve o serviço e o nome do canal. */
function getChannelInfo(
  rawName: string
): { hostKey: string; hostName: string; channelName: string } | null {
  // No Brasil o Lionsgate+ (antigo Starz) só existe como canal da Amazon, mesmo quando o TMDB o lista como serviço próprio
  if (/lionsgate|starz/i.test(rawName)) {
    return { hostKey: "prime_video", hostName: "Prime Video", channelName: "Lionsgate+" };
  }
  for (const host of CHANNEL_HOSTS) {
    if (host.pattern.test(rawName)) {
      return {
        hostKey: host.hostKey,
        hostName: host.hostName,
        channelName: rawName.replace(host.pattern, "").trim(),
      };
    }
  }
  return null;
}

/** Variantes de plano (ex.: "Netflix with Ads") perdem para a versão principal; canais perdem de todas. */
function variantPenalty(rawName: string): number {
  if (getChannelInfo(rawName)) return 2;
  return /with\s+ads|standard|basic|premium/i.test(rawName) ? 1 : 0;
}

/**
 * Filtra e consolida uma lista bruta de provedores em marcas brasileiras com link ativo.
 * Quando há várias variantes da mesma marca, usa a principal (logo e nome corretos).
 */
export function filterValidProviders(list: WatchProvider[]): ProcessedProvider[] {
  const byBrand = new Map<
    string,
    { provider: ProcessedProvider; penalty: number; ownIdentity: boolean; notes: Set<string> }
  >();

  for (const p of list) {
    const channel = getChannelInfo(p.providerName);
    const own = getBrandInfo(p.providerName);

    // Canal: vira o serviço que o vende (Prime Video/Apple TV), exceto as marcas que mantêm a
    // própria identidade. Em ambos os casos exige um canal extra.
    const ownIdentity = Boolean(channel) && KEEP_OWN_IDENTITY_KEYS.has(own.brandKey);
    const { brandKey, displayName } =
      channel && !ownIdentity
        ? { brandKey: channel.hostKey, displayName: channel.hostName }
        : own;
    const homeUrl = getStreamingHomeUrl(brandKey);

    // Se a plataforma não tem assinatura/operação direta no Brasil, não exibe o badge
    if (!homeUrl) continue;

    const penalty = variantPenalty(p.providerName);
    const existing = byBrand.get(brandKey);
    const notes = existing?.notes ?? new Set<string>();
    if (channel) notes.add(ownIdentity ? channel.hostName : channel.channelName);
    if (existing && existing.penalty <= penalty) continue;

    const logoUrl = LOCAL_LOGO_KEYS.has(brandKey)
      ? `/providers/${brandKey}.png`
      : BRAND_LOGOS[brandKey] ||
        (p.logoPath ? `https://image.tmdb.org/t/p/original${p.logoPath}` : null);

    byBrand.set(brandKey, {
      penalty,
      ownIdentity,
      notes,
      provider: {
        ...p,
        brandKey,
        cleanName: displayName,
        homeUrl,
        logoUrl,
        requiresAddon: Boolean(channel) && !(ownIdentity && DIRECT_SUBSCRIPTION_KEYS.has(brandKey)),
        addonNote: null,
      },
    });
  }

  // Ordem alfabética (A-Z), ignorando acentos e maiúsculas
  return [...byBrand.values()]
    .map((entry) => {
      const names = [...entry.notes].sort().join(", ");
      const addonNote = entry.provider.requiresAddon
        ? entry.ownIdentity
          ? `via canal no ${names}`
          : `via canal ${names}`
        : null;
      return { ...entry.provider, addonNote };
    })
    .sort((a, b) => a.cleanName.localeCompare(b.cleanName, "pt-BR", { sensitivity: "base" }));
}
