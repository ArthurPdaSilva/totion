import { describe, expect, it } from "vitest";
import type { Application } from "../types/application";
import {
  createApplicationBackup,
  parseApplicationBackup,
} from "./applicationBackup";

const APPLICATIONS: Application[] = [
  createApplication("applied-1", "applied"),
  createApplication("progress-1", "in_progress"),
  createApplication("closed-1", "closed"),
];

function createApplication(
  id: string,
  status: Application["status"],
): Application {
  return {
    id,
    name: `Vaga ${id}`,
    status,
    appliedAt: "2026-08-16",
    jobUrl: "https://empresa.example/vaga",
    notes: "Anotação sintética",
    position: 0,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T13:00:00.000Z",
  };
}

describe("applicationBackup", () => {
  it("exporta e importa todos os dados e a ordem das três colunas", () => {
    const exportedAt = "2026-08-16T15:00:00.000Z";
    const exported = createApplicationBackup(APPLICATIONS, exportedAt);

    expect(exported.fileName).toBe("totion-backup-2026-08-16.totion");
    expect(parseApplicationBackup(exported.content)).toEqual({
      success: true,
      backup: {
        format: "totion",
        version: 1,
        exportedAt,
        applications: APPLICATIONS,
      },
    });
  });

  it("rejeita JSON inválido e versões incompatíveis", () => {
    expect(parseApplicationBackup("não é JSON")).toEqual({
      success: false,
      error: "O arquivo não contém um backup Totion válido.",
    });
    expect(
      parseApplicationBackup(JSON.stringify({ format: "totion", version: 2 })),
    ).toEqual({
      success: false,
      error: "O formato ou a versão deste backup não é compatível.",
    });
  });

  it("rejeita dados de candidatura e posições adulterados", () => {
    const exported = JSON.parse(
      createApplicationBackup(APPLICATIONS).content,
    ) as { applications: Application[] };
    exported.applications[0] = {
      ...createApplication("applied-1", "applied"),
      jobUrl: "javascript:alert(1)",
    };

    expect(parseApplicationBackup(JSON.stringify(exported))).toMatchObject({
      success: false,
      error: "O backup contém uma ou mais candidaturas inválidas.",
    });

    exported.applications[0] = {
      ...createApplication("applied-1", "applied"),
      position: 1,
    };
    expect(parseApplicationBackup(JSON.stringify(exported))).toMatchObject({
      success: false,
      error: "O backup contém IDs repetidos ou uma ordenação inválida.",
    });
  });
});
