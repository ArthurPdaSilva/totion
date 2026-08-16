import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ApplicationsRepository } from "../../../database/repositories/applicationsRepository";
import type { Application } from "../types/application";
import { useApplications } from "./useApplications";

const INITIAL_APPLICATIONS: Application[] = [
  createApplication("applied-1", 0),
  createApplication("applied-2", 1),
  createApplication("applied-3", 2),
];

function createApplication(id: string, position: number): Application {
  return {
    id,
    name: `Vaga ${id}`,
    status: "applied",
    appliedAt: "2026-08-16",
    jobUrl: null,
    notes: null,
    position,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  };
}

describe("useApplications", () => {
  it("reconcilia o card movido e as posições normalizadas", async () => {
    const repository: ApplicationsRepository = {
      async list() {
        return INITIAL_APPLICATIONS;
      },
      async create() {
        throw new Error("Não usado neste teste");
      },
      async createMany() {
        return [];
      },
      async updateById() {
        return [
          {
            ...createApplication("applied-3", 2),
            position: 1,
            updatedAt: "2026-08-17T09:00:00.000Z",
          },
          {
            ...createApplication("applied-2", 1),
            status: "closed",
            position: 0,
            updatedAt: "2026-08-17T09:00:00.000Z",
          },
        ];
      },
      async moveById() {
        return [];
      },
      async deleteById() {
        return [];
      },
    };
    const { result } = renderHook(() => useApplications(repository));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.editApplication("applied-2", {
        name: "Vaga applied-2",
        status: "closed",
        appliedAt: "2026-08-16",
        jobUrl: null,
        notes: null,
      });
    });

    expect(result.current.applications).toMatchObject([
      { id: "applied-1", status: "applied", position: 0 },
      { id: "applied-2", status: "closed", position: 0 },
      { id: "applied-3", status: "applied", position: 1 },
    ]);
  });

  it("restaura a ordem otimista quando a persistência falha", async () => {
    const repository: ApplicationsRepository = {
      async list() {
        return INITIAL_APPLICATIONS;
      },
      async create() {
        throw new Error("Não usado neste teste");
      },
      async createMany() {
        return [];
      },
      async updateById() {
        return [];
      },
      async moveById() {
        throw new Error("Falha sintética no movimento");
      },
      async deleteById() {
        return [];
      },
    };
    const { result } = renderHook(() => useApplications(repository));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.beginApplicationMove();
      result.current.previewApplicationMove("applied-1", {
        type: "application",
        id: "applied-3",
        edge: "after",
      });
    });
    expect(
      result.current.applications.map((application) => application.id),
    ).toEqual(["applied-2", "applied-3", "applied-1"]);

    await act(async () => {
      await expect(
        result.current.commitApplicationMove("applied-1", {
          type: "application",
          id: "applied-3",
          edge: "after",
        }),
      ).rejects.toThrow("Falha sintética no movimento");
    });
    expect(result.current.applications).toMatchObject(INITIAL_APPLICATIONS);
  });

  it("aplica a borda final quando ela muda depois do preview", async () => {
    let persistedPosition: number | null = null;
    const repository: ApplicationsRepository = {
      async list() {
        return INITIAL_APPLICATIONS;
      },
      async create() {
        throw new Error("Não usado neste teste");
      },
      async createMany() {
        return [];
      },
      async updateById() {
        return [];
      },
      async moveById(_id, _status, targetPosition) {
        persistedPosition = targetPosition;
        return [];
      },
      async deleteById() {
        return [];
      },
    };
    const { result } = renderHook(() => useApplications(repository));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.beginApplicationMove();
      result.current.previewApplicationMove("applied-1", {
        type: "application",
        id: "applied-3",
        edge: "before",
      });
    });
    await act(async () => {
      await result.current.commitApplicationMove("applied-1", {
        type: "application",
        id: "applied-3",
        edge: "after",
      });
    });

    expect(
      result.current.applications.map((application) => application.id),
    ).toEqual(["applied-2", "applied-3", "applied-1"]);
    expect(persistedPosition).toBe(2);
  });
});
