import { describe, expect, it } from "vitest";
import type { JobPortal, WorkspaceNote } from "../../resources/types/resource";
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
const JOB_PORTALS: JobPortal[] = [
  {
    id: "portal-1",
    name: "Portal sintético",
    url: "https://portal.example",
    createdAt: "2026-08-16T14:00:00.000Z",
    updatedAt: "2026-08-16T14:00:00.000Z",
  },
];
const NOTES: WorkspaceNote[] = [
  {
    id: "note-1",
    content: "Anotação independente",
    createdAt: "2026-08-16T14:30:00.000Z",
    updatedAt: "2026-08-16T14:30:00.000Z",
  },
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
  it("exporta e importa todas as cinco listas", () => {
    const exportedAt = "2026-08-16T15:00:00.000Z";
    const exported = createApplicationBackup(
      { applications: APPLICATIONS, jobPortals: JOB_PORTALS, notes: NOTES },
      exportedAt,
    );

    expect(exported.fileName).toBe("totion-backup-2026-08-16.totion");
    expect(parseApplicationBackup(exported.content)).toEqual({
      success: true,
      backup: {
        format: "totion",
        version: 2,
        exportedAt,
        applications: APPLICATIONS,
        jobPortals: JOB_PORTALS,
        notes: NOTES,
      },
    });
  });

  it("rejeita JSON inválido e versões incompatíveis", () => {
    expect(parseApplicationBackup("não é JSON")).toEqual({
      success: false,
      error: "O arquivo não contém um backup Totion válido.",
    });
    expect(
      parseApplicationBackup(JSON.stringify({ format: "totion", version: 3 })),
    ).toEqual({
      success: false,
      error: "O formato ou a versão deste backup não é compatível.",
    });
  });

  it("restaura backups v1 com as novas listas vazias", () => {
    const legacyBackup = {
      format: "totion",
      version: 1,
      exportedAt: "2026-08-16T15:00:00.000Z",
      applications: APPLICATIONS,
    };

    expect(parseApplicationBackup(JSON.stringify(legacyBackup))).toMatchObject({
      success: true,
      backup: {
        version: 2,
        applications: APPLICATIONS,
        jobPortals: [],
        notes: [],
      },
    });
  });

  it("rejeita dados de candidatura e posições adulterados", () => {
    const exported = JSON.parse(
      createApplicationBackup({
        applications: APPLICATIONS,
        jobPortals: JOB_PORTALS,
        notes: NOTES,
      }).content,
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
