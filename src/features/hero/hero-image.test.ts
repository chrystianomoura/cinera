import { describe, expect, it } from "vitest";
import { heroImageSources, heroPreloadAttrs, HERO_FALLBACK_SIZES } from "./hero-image";

const PATH = "/3icyRAqgakNcQn6aDVz9libFmBA.jpg";
const BASE = "https://image.tmdb.org/t/p";

describe("plano B da foto do destaque (JPEG da TMDB)", () => {
  it("oferece w780, w1280 e a original (3840 px), para o navegador escolher a que cobre a foto sem esticar", () => {
    const { src, srcSet } = heroImageSources(PATH);

    expect(src).toBe(`${BASE}/w1280${PATH}`);
    expect(srcSet).toBe(`${BASE}/w780${PATH} 780w, ${BASE}/w1280${PATH} 1280w, ${BASE}/original${PATH} 3840w`);
  });

  it("o `sizes` conta a foto inteira (não o quadro): 236vw no celular e no mínimo 1432 px no desktop", () => {
    expect(heroImageSources(PATH).sizes).toBe(HERO_FALLBACK_SIZES);
    expect(HERO_FALLBACK_SIZES).toBe("(max-width: 767px) 236vw, max(106vw, 1432px)");
  });

  it("sem foto de fundo, não monta endereço nenhum", () => {
    expect(heroImageSources(null)).toEqual({ src: "", srcSet: undefined, sizes: undefined });
  });
});

describe("preload da foto do destaque", () => {
  it("com o AVIF gerado no build, precarrega ele (e só ele): mesmo domínio, tipo avif, sem srcset", () => {
    expect(heroPreloadAttrs(PATH, "/hero/3icy.abcd1234.avif")).toEqual({
      rel: "preload",
      as: "image",
      type: "image/avif",
      href: "/hero/3icy.abcd1234.avif",
      fetchpriority: "high",
    });
  });

  it("sem o AVIF, o preload é idêntico ao <img> do plano B: mesma foto, mesma lista e mesmo `sizes` (senão seria baixada duas vezes)", () => {
    const img = heroImageSources(PATH);

    expect(heroPreloadAttrs(PATH)).toEqual({
      rel: "preload",
      as: "image",
      href: img.src,
      imagesrcset: img.srcSet,
      imagesizes: img.sizes,
      fetchpriority: "high",
    });
  });

  it("sem destaque no catálogo, não há preload", () => {
    expect(heroPreloadAttrs(undefined)).toBeNull();
    expect(heroPreloadAttrs(null)).toBeNull();
    expect(heroPreloadAttrs("")).toBeNull();
    expect(heroPreloadAttrs("", "/hero/x.avif")).toBeNull();
  });
});
