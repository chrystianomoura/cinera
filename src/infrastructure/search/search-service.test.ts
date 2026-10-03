import { describe, expect, it } from "vitest";
import {
  canonicalizeSpelling,
  cleanFranchiseName,
  isTitleExactMatch,
  matchFranchise,
  normalizeSearchString,
  stripLeadingArticles,
} from "./search-service";

describe("normalizeSearchString", () => {
  it("remove acentos, pontuação e caixa", () => {
    expect(normalizeSearchString("Ação & Aventura!")).toBe("acao e aventura");
    expect(normalizeSearchString("  O  Poderoso   Chefão ")).toBe("o poderoso chefao");
  });

  it("preserva escritas não latinas", () => {
    expect(normalizeSearchString("千と千尋の神隠し")).toBe("千と千尋の神隠し");
  });
});

describe("stripLeadingArticles", () => {
  it("tira artigos iniciais sem quebrar palavras que começam como eles", () => {
    expect(stripLeadingArticles("os vingadores")).toBe("vingadores");
    expect(stripLeadingArticles("the dark knight")).toBe("dark knight");
    expect(stripLeadingArticles("acao")).toBe("acao");
    expect(stripLeadingArticles("aereo")).toBe("aereo");
  });
});

describe("cleanFranchiseName", () => {
  it("remove sufixos de coleção", () => {
    expect(cleanFranchiseName("Coleção Toy Story")).toBe("toy story");
    expect(cleanFranchiseName("The Matrix Collection")).toBe("the matrix");
    expect(cleanFranchiseName("")).toBe("");
  });
});

describe("matchFranchise", () => {
  it("compara o nome da coleção com a busca, com ou sem artigo", () => {
    expect(matchFranchise("Coleção O Senhor dos Anéis", "The Lord of the Rings Collection", "senhor dos aneis")).toBe(true);
    expect(matchFranchise("Coleção O Senhor dos Anéis", "The Lord of the Rings Collection", "lord of the rings")).toBe(true);
    expect(matchFranchise("Coleção Toy Story", undefined, "matrix")).toBe(false);
  });
});

describe("isTitleExactMatch", () => {
  it("reconhece o título localizado, o original e a versão sem artigo", () => {
    const q = normalizeSearchString("poderoso chefao");
    const clean = cleanFranchiseName("poderoso chefao");
    expect(isTitleExactMatch("O Poderoso Chefão", "The Godfather", q, clean)).toBe(true);
    expect(isTitleExactMatch("Outro Filme", "The Godfather", normalizeSearchString("the godfather"), cleanFranchiseName("the godfather"))).toBe(true);
    expect(isTitleExactMatch("Outro Filme", "Another", q, clean)).toBe(false);
  });
});

describe("canonicalizeSpelling", () => {
  it("normaliza grafias populares", () => {
    expect(canonicalizeSpelling("spiderman no way home")).toBe("spider man no way home");
    expect(canonicalizeSpelling("matrix")).toBe("matrix");
  });
});
