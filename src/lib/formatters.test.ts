import { describe, expect, it } from "vitest";
import { formatCurrencyUSD, formatRuntime } from "./formatters";

describe("formatRuntime", () => {
  it("formata horas e minutos", () => {
    expect(formatRuntime(169)).toBe("2h 49m");
    expect(formatRuntime(120)).toBe("2h");
    expect(formatRuntime(45)).toBe("45m");
  });

  it("devolve null para valores ausentes ou inválidos", () => {
    expect(formatRuntime(undefined)).toBeNull();
    expect(formatRuntime(0)).toBeNull();
    expect(formatRuntime(-10)).toBeNull();
  });
});

describe("formatCurrencyUSD", () => {
  it("abrevia em mil, milhão/milhões e bilhão/bilhões", () => {
    expect(formatCurrencyUSD(500)).toBe("US$ 500");
    expect(formatCurrencyUSD(12_500)).toMatch(/^US\$ 12,5 mil$/);
    expect(formatCurrencyUSD(1_000_000)).toBe("US$ 1 milhão");
    expect(formatCurrencyUSD(237_000_000)).toBe("US$ 237 milhões");
    expect(formatCurrencyUSD(1_500_000_000)).toMatch(/bilhão$/);
    expect(formatCurrencyUSD(2_920_000_000)).toMatch(/bilhões$/);
  });

  it("devolve null para valores ausentes ou zerados", () => {
    expect(formatCurrencyUSD(undefined)).toBeNull();
    expect(formatCurrencyUSD(0)).toBeNull();
  });
});
