import { describe, expect, it } from "vitest";
import { shouldUseShell } from "./page-scroll";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1";
const IPHONE_FIREFOX =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/118.0 Mobile/15E148 Safari/605.1.15";
const IPHONE_EDGE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/118.0.2088.69 Mobile/15E148 Safari/605.1.15";
const IPAD_CHROME =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

const decide = (userAgent: string, extra: Partial<Parameters<typeof shouldUseShell>[0]> = {}) =>
  shouldUseShell({ userAgent, platform: "iPhone", maxTouchPoints: 5, search: "", stored: null, ...extra });

describe("shouldUseShell", () => {
  it("liga em todos os navegadores do iPhone e do iPad, Safari incluído", () => {
    expect(decide(IPHONE_SAFARI)).toBe(true);
    expect(decide(IPAD_SAFARI_DESKTOP, { platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(decide(IPHONE_CHROME)).toBe(true);
    expect(decide(IPHONE_FIREFOX)).toBe(true);
    expect(decide(IPHONE_EDGE)).toBe(true);
    expect(decide(IPAD_CHROME, { platform: "iPad" })).toBe(true);
  });

  it("não liga no Android nem no desktop", () => {
    expect(decide(ANDROID_CHROME, { platform: "Linux armv81", maxTouchPoints: 5 })).toBe(false);
    expect(decide(MAC_CHROME, { platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
  });

  it("?shell=1 força, ?shell=0 desliga e a escolha guardada vale", () => {
    expect(decide(MAC_CHROME, { platform: "MacIntel", maxTouchPoints: 0, search: "?shell=1" })).toBe(true);
    expect(decide(IPHONE_CHROME, { search: "?shell=0" })).toBe(false);
    expect(decide(ANDROID_CHROME, { platform: "Linux armv81", stored: "1" })).toBe(true);
    // o parâmetro da URL manda mais que o valor guardado
    expect(decide(IPHONE_SAFARI, { stored: "1", search: "?shell=0" })).toBe(false);
  });
});
