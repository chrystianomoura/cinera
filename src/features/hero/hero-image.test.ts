import { describe, expect, it } from "vitest";
import { heroImageSources } from "./hero-image";

const PATH = "/3icyRAqgakNcQn6aDVz9libFmBA.jpg";

describe("foto do destaque", () => {
  it("oferece só w780 e w1280: o original (até 1,5 MB) nunca é pedido", () => {
    const { src, srcSet } = heroImageSources(PATH);

    expect(src).toBe(`https://image.tmdb.org/t/p/w1280${PATH}`);
    expect(srcSet).toBe(`https://image.tmdb.org/t/p/w780${PATH} 780w, https://image.tmdb.org/t/p/w1280${PATH} 1280w`);
    expect(`${src} ${srcSet}`).not.toContain("original");
  });

  it("sem foto de fundo, não monta endereço nenhum", () => {
    expect(heroImageSources(null)).toEqual({ src: "", srcSet: undefined, sizes: undefined });
  });
});
