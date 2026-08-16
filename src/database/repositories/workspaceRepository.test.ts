import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Application } from "../../features/applications/types/application";
import type {
  JobPortal,
  WorkspaceNote,
} from "../../features/resources/types/resource";
import { TotionDatabase } from "../database";
import { DexieWorkspaceRepository } from "./workspaceRepository";

const databases: TotionDatabase[] = [];

function createDatabase() {
  const database = new TotionDatabase(
    `totion-workspace-${crypto.randomUUID()}`,
  );
  databases.push(database);
  return database;
}

function createApplication(id: string): Application {
  return {
    id,
    name: `Vaga ${id}`,
    status: "applied",
    appliedAt: "2026-08-16",
    jobUrl: null,
    notes: null,
    position: 0,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  };
}

function createJobPortal(id: string): JobPortal {
  return {
    id,
    name: `Portal ${id}`,
    url: "https://portal.example",
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  };
}

function createNote(id: string): WorkspaceNote {
  return {
    id,
    content: `Anotação ${id}`,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  };
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe("DexieWorkspaceRepository", () => {
  it("migra o banco v1 preservando candidaturas existentes", async () => {
    const databaseName = `totion-migration-${crypto.randomUUID()}`;
    const legacyDatabase = new Dexie(databaseName);
    legacyDatabase.version(1).stores({
      applications: "id, status, [status+position], createdAt",
    });
    await legacyDatabase
      .table("applications")
      .add(createApplication("legacy-application"));
    legacyDatabase.close();

    const database = new TotionDatabase(databaseName);
    databases.push(database);

    await expect(database.applications.toArray()).resolves.toMatchObject([
      { id: "legacy-application" },
    ]);
    await expect(database.jobPortals.toArray()).resolves.toEqual([]);
    await expect(database.notes.toArray()).resolves.toEqual([]);
  });

  it("persiste o CRUD de portais e anotações", async () => {
    const repository = new DexieWorkspaceRepository(createDatabase());
    const portal = createJobPortal("portal-1");
    const note = createNote("note-1");

    await repository.createJobPortal(portal);
    await repository.createNote(note);
    await expect(repository.listJobPortals()).resolves.toEqual([portal]);
    await expect(repository.listNotes()).resolves.toEqual([note]);

    await repository.updateJobPortal({ ...portal, name: "Portal atualizado" });
    await repository.updateNote({ ...note, content: "Texto atualizado" });
    await expect(repository.listJobPortals()).resolves.toMatchObject([
      { name: "Portal atualizado" },
    ]);
    await expect(repository.listNotes()).resolves.toMatchObject([
      { content: "Texto atualizado" },
    ]);

    await repository.deleteJobPortal(portal.id);
    await repository.deleteNote(note.id);
    await expect(repository.listJobPortals()).resolves.toEqual([]);
    await expect(repository.listNotes()).resolves.toEqual([]);
  });

  it("restaura as cinco listas em uma transação e faz rollback em falha", async () => {
    const database = createDatabase();
    const repository = new DexieWorkspaceRepository(database);
    const currentApplication = createApplication("current-application");
    const currentPortal = createJobPortal("current-portal");
    const currentNote = createNote("current-note");
    await database.applications.add(currentApplication);
    await repository.createJobPortal(currentPortal);
    await repository.createNote(currentNote);

    const restored = {
      applications: [createApplication("restored-application")],
      jobPortals: [createJobPortal("restored-portal")],
      notes: [createNote("restored-note")],
    };
    await repository.restore(restored);
    await expect(database.applications.toArray()).resolves.toEqual(
      restored.applications,
    );
    await expect(repository.listJobPortals()).resolves.toEqual(
      restored.jobPortals,
    );
    await expect(repository.listNotes()).resolves.toEqual(restored.notes);

    vi.spyOn(database.notes, "bulkAdd").mockRejectedValueOnce(
      new Error("Falha sintética"),
    );
    await expect(
      repository.restore({
        applications: [createApplication("failed-application")],
        jobPortals: [createJobPortal("failed-portal")],
        notes: [createNote("failed-note")],
      }),
    ).rejects.toThrow("Falha sintética");
    await expect(database.applications.toArray()).resolves.toEqual(
      restored.applications,
    );
    await expect(repository.listJobPortals()).resolves.toEqual(
      restored.jobPortals,
    );
    await expect(repository.listNotes()).resolves.toEqual(restored.notes);
  });
});
