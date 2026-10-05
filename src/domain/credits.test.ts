import { describe, expect, it } from "vitest";
import { getDisplayCast, type CastMember } from "./credits";

const actor = (id: number, profilePath: string | null): CastMember => ({ id, name: `Ator ${id}`, character: "X", profilePath, order: id });

describe("getDisplayCast", () => {
  it("só mantém os atores com foto", () => {
    const cast = [actor(1, "/a.jpg"), actor(2, null), actor(3, "/c.jpg")];
    expect(getDisplayCast(cast).map((a) => a.id)).toEqual([1, 3]);
  });

  it("devolve vazio quando há atores mas nenhum tem foto (a seção do elenco não deve aparecer)", () => {
    expect(getDisplayCast([actor(1, null), actor(2, null)])).toEqual([]);
  });

  it("limita a 18 atores, na ordem recebida", () => {
    const cast = Array.from({ length: 25 }, (_, i) => actor(i + 1, `/p${i}.jpg`));
    const shown = getDisplayCast(cast);
    expect(shown).toHaveLength(18);
    expect(shown[0].id).toBe(1);
    expect(shown[17].id).toBe(18);
  });

  it("aceita elenco ausente", () => {
    expect(getDisplayCast(undefined)).toEqual([]);
    expect(getDisplayCast(null)).toEqual([]);
  });
});
