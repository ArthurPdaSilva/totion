import { describe, expect, it } from "vitest";
import { includesSearchTerm, normalizeSearchText } from "./search";

describe("search", () => {
  it("normaliza caixa, espaços e acentos", () => {
    expect(normalizeSearchText("  Currículo ÁGIL  ")).toBe("curriculo agil");
    expect(includesSearchTerm(["Revisar currículo", null], "curriculo")).toBe(
      true,
    );
  });
});
