import { describe, expect, it } from "vitest";
import { applicationSchema } from "./applicationSchema";

const validApplication = {
  name: "Desenvolvedor Front-end",
  status: "applied" as const,
  appliedAt: "2026-08-16",
  jobUrl: "https://empresa.example/vagas/123",
  notes: "Conversa inicial marcada",
};

describe("applicationSchema", () => {
  it("normaliza os campos antes de persistir", () => {
    const result = applicationSchema.parse({
      ...validApplication,
      name: "  Desenvolvedor Front-end  ",
      jobUrl: "  https://empresa.example/vagas/123  ",
      notes: "  Primeira linha\n  segunda linha  ",
    });

    expect(result).toEqual({
      ...validApplication,
      notes: "Primeira linha\n  segunda linha",
    });
  });

  it("converte link e anotações vazios em null", () => {
    const result = applicationSchema.parse({
      ...validApplication,
      jobUrl: "   ",
      notes: "  ",
    });

    expect(result.jobUrl).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("rejeita nome vazio, URL insegura e data civil impossível", () => {
    const result = applicationSchema.safeParse({
      ...validApplication,
      name: "   ",
      appliedAt: "2026-02-30",
      jobUrl: "ftp://empresa.example/vaga",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Informe o nome da vaga");
      expect(messages).toContain("Informe uma data válida");
      expect(messages).toContain(
        "Informe um link completo começando com http:// ou https://",
      );
    }
  });

  it("aceita 29 de fevereiro somente em ano bissexto", () => {
    expect(
      applicationSchema.safeParse({
        ...validApplication,
        appliedAt: "2024-02-29",
      }).success,
    ).toBe(true);
    expect(
      applicationSchema.safeParse({
        ...validApplication,
        appliedAt: "2025-02-29",
      }).success,
    ).toBe(false);
  });
});
