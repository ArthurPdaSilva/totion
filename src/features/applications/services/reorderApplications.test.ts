import { describe, expect, it } from "vitest";
import type { Application, ApplicationStatus } from "../types/application";
import { reorderApplications } from "./reorderApplications";

function createApplication(
  id: string,
  status: ApplicationStatus,
  position: number,
): Application {
  return {
    id,
    name: `Vaga ${id}`,
    status,
    appliedAt: "2026-08-16",
    jobUrl: null,
    notes: null,
    position,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  };
}

describe("reorderApplications", () => {
  it("reordena dentro da mesma coluna", () => {
    const applications = [
      createApplication("first", "applied", 0),
      createApplication("second", "applied", 1),
      createApplication("third", "applied", 2),
    ];

    const reordered = reorderApplications(applications, "first", {
      type: "application",
      id: "third",
      edge: "after",
    });

    expect(reordered).toMatchObject([
      { id: "second", status: "applied", position: 0 },
      { id: "third", status: "applied", position: 1 },
      { id: "first", status: "applied", position: 2 },
    ]);
  });

  it("move entre colunas na posição do card de destino", () => {
    const applications = [
      createApplication("first", "applied", 0),
      createApplication("second", "applied", 1),
      createApplication("progress", "in_progress", 0),
    ];

    const reordered = reorderApplications(applications, "second", {
      type: "application",
      id: "progress",
      edge: "before",
    });

    expect(reordered).toMatchObject([
      { id: "first", status: "applied", position: 0 },
      { id: "second", status: "in_progress", position: 0 },
      { id: "progress", status: "in_progress", position: 1 },
    ]);
  });

  it("insere entre o primeiro e o segundo card da coluna de destino", () => {
    const applications = [
      createApplication("moved", "applied", 0),
      createApplication("closed-first", "closed", 0),
      createApplication("closed-second", "closed", 1),
      createApplication("closed-third", "closed", 2),
    ];

    const reordered = reorderApplications(applications, "moved", {
      type: "application",
      id: "closed-first",
      edge: "after",
    });

    expect(reordered).toMatchObject([
      { id: "closed-first", status: "closed", position: 0 },
      { id: "moved", status: "closed", position: 1 },
      { id: "closed-second", status: "closed", position: 2 },
      { id: "closed-third", status: "closed", position: 3 },
    ]);
  });

  it("move o primeiro card para depois do segundo", () => {
    const applications = [
      createApplication("first", "applied", 0),
      createApplication("second", "applied", 1),
    ];

    const reordered = reorderApplications(applications, "first", {
      type: "application",
      id: "second",
      edge: "after",
    });

    expect(reordered).toMatchObject([
      { id: "second", status: "applied", position: 0 },
      { id: "first", status: "applied", position: 1 },
    ]);
  });

  it("aceita uma coluna vazia como destino", () => {
    const applications = [createApplication("first", "applied", 0)];

    const reordered = reorderApplications(applications, "first", {
      type: "column",
      status: "closed",
    });

    expect(reordered).toMatchObject([
      { id: "first", status: "closed", position: 0 },
    ]);
  });

  it("mantém o estado quando o destino não existe", () => {
    const applications = [createApplication("first", "applied", 0)];

    expect(
      reorderApplications(applications, "first", {
        type: "application",
        id: "missing",
        edge: "before",
      }),
    ).toBe(applications);
  });

  it("mantém a ordem ao repetir o mesmo destino", () => {
    const applications = [
      createApplication("first", "applied", 0),
      createApplication("second", "applied", 1),
      createApplication("third", "applied", 2),
    ];
    const target = {
      type: "application" as const,
      id: "third",
      edge: "after" as const,
    };

    const firstMove = reorderApplications(applications, "first", target);
    const repeatedMove = reorderApplications(firstMove, "first", target);

    expect(repeatedMove).toEqual(firstMove);
  });
});
