import { describe, expect, it } from "vitest";
import { jobPortalSchema, workspaceNoteSchema } from "./resourceSchemas";

describe("resourceSchemas", () => {
  it("normaliza portais e aceita somente links HTTP ou HTTPS", () => {
    expect(
      jobPortalSchema.parse({
        name: "  Gupy  ",
        url: "  https://portal.example/vagas  ",
      }),
    ).toEqual({ name: "Gupy", url: "https://portal.example/vagas" });
    expect(
      jobPortalSchema.safeParse({
        name: "Inválido",
        url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("exige conteúdo e preserva quebras internas da anotação", () => {
    expect(
      workspaceNoteSchema.parse({ content: "  Linha 1\n\nLinha 2  " }),
    ).toEqual({ content: "Linha 1\n\nLinha 2" });
    expect(workspaceNoteSchema.safeParse({ content: "   " }).success).toBe(
      false,
    );
  });
});
