import { describe, expect, it } from "vitest";
import type { WatchProvider } from "@/domain";
import { filterValidProviders } from "./provider-rules";

const provider = (providerName: string, providerId = 1): WatchProvider => ({ providerId, providerName, logoPath: "/logo.png", displayPriority: 1 });
const one = (name: string) => filterValidProviders([provider(name)])[0];

describe("provedores do TMDB no Brasil → marca, nome e canal extra", () => {
  // Nomes reais devolvidos pelo TMDB para o Brasil (consulta de 03/10/2026)
  const matrix: [string, string, string, boolean][] = [
    ["Netflix", "netflix", "Netflix", false],
    ["Netflix Standard with Ads", "netflix", "Netflix", false],
    ["Amazon Prime Video", "prime_video", "Prime Video", false],
    ["Amazon Video", "prime_video", "Prime Video", false],
    ["Amazon Prime Video with Ads", "prime_video", "Prime Video", false],
    ["Disney Plus", "disney", "Disney+", false],
    ["HBO Max", "max", "HBO Max", false],
    ["Paramount Plus", "paramount", "Paramount+", false],
    ["Paramount Plus Premium", "paramount", "Paramount+", false],
    ["Apple TV", "apple_tv", "Apple TV", false],
    ["Apple TV Store", "apple_tv", "Apple TV", false],
    ["Google Play Movies", "youtube", "YouTube", false],
    ["Claro video", "claro", "Claro tv+", false],
    ["Claro tv+", "claro", "Claro tv+", false],
    ["Globoplay", "globoplay", "Globoplay", false],
    ["Plex Channel", "plex", "Plex", false],
    ["Belas Artes à La Carte", "belas_artes", "Belas Artes À La Carte", false],
    ["Telecine Amazon Channel", "prime_video", "Prime Video", true],
    ["Paramount+ Amazon Channel", "prime_video", "Prime Video", true],
    ["HBO Max Amazon Channel", "prime_video", "Prime Video", true],
    ["MGM+ Apple TV Channel", "apple_tv", "Apple TV", true],
    ["Lionsgate+ Amazon Channel", "prime_video", "Prime Video", true],
    ["Doc Canal Brasil Amazon Channel", "prime_video", "Prime Video", true],
    ["Sony One Amazon Channel", "sony", "Sony One", true],
    ["Diamond Films Amazon Channel", "diamond_films", "Diamond Films", true],
    ["Multishow Amazon Channel", "multishow", "Multishow", true],
    // O Universal+ também tem assinatura direta no Brasil: não exige canal extra
    ["Universal+ Amazon Channel", "universal", "Universal+", false],
  ];

  for (const [raw, brandKey, cleanName, requiresAddon] of matrix) {
    it(`${raw} → ${cleanName}${requiresAddon ? " + canal extra" : ""}`, () => {
      const result = one(raw);
      expect(result).toBeDefined();
      expect(result).toMatchObject({ brandKey, cleanName, requiresAddon });
      expect(result.homeUrl).toMatch(/^https:\/\//);
    });
  }

  it("descarta plataformas sem operação ou link oficial no Brasil", () => {
    expect(filterValidProviders([provider("JustWatch TV"), provider("Magellan TV"), provider("Dekkoo")])).toEqual([]);
  });
});

describe("Lionsgate+", () => {
  it("sempre vira canal da Amazon, mesmo quando o TMDB o lista como serviço próprio", () => {
    for (const raw of ["Lionsgate Plus", "Lionsgate+", "Starz"]) {
      expect(one(raw)).toMatchObject({ brandKey: "prime_video", cleanName: "Prime Video", requiresAddon: true, addonNote: "via canal Lionsgate+" });
    }
  });
});

describe("consolidação", () => {
  it("uma marca com várias variantes aparece uma vez, com a versão principal", () => {
    const result = filterValidProviders([provider("Netflix Standard with Ads", 1), provider("Netflix", 2)]);
    expect(result).toHaveLength(1);
    expect(result[0].providerId).toBe(2);
  });

  it("canais da Amazon se juntam num só cartão, com os nomes na nota", () => {
    const result = filterValidProviders([provider("Telecine Amazon Channel", 1), provider("MUBI Amazon Channel", 2)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ brandKey: "prime_video", requiresAddon: true });
    expect(result[0].addonNote).toBe("via canal MUBI, Telecine");
  });

  it("o Prime Video direto não exige canal extra, mesmo com canais da Amazon na lista", () => {
    const result = filterValidProviders([provider("Telecine Amazon Channel", 1), provider("Amazon Prime Video", 2)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ providerId: 2, requiresAddon: false, addonNote: null });
  });

  it("ordena de A a Z ignorando acentos e maiúsculas", () => {
    const names = filterValidProviders([provider("Netflix", 1), provider("Apple TV", 2), provider("Globoplay", 3)]).map((p) => p.cleanName);
    expect(names).toEqual(["Apple TV", "Globoplay", "Netflix"]);
  });

  it("lista vazia dá lista vazia", () => {
    expect(filterValidProviders([])).toEqual([]);
  });
});
