import { afterEach, describe, expect, it } from "vitest";
import { TotionDatabase } from "../database";
import {
  type ApplicationWithoutPosition,
  DexieApplicationsRepository,
} from "./applicationsRepository";

const databases: TotionDatabase[] = [];

function createDatabase() {
  const database = new TotionDatabase(`totion-test-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

function createApplication(
  id: string,
  status: ApplicationWithoutPosition["status"],
): ApplicationWithoutPosition {
  return {
    id,
    name: `Vaga ${id}`,
    status,
    appliedAt: "2026-08-16",
    jobUrl: null,
    notes: null,
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

describe("DexieApplicationsRepository", () => {
  it("atribui posições independentes por status e preserva a ordem", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());

    const firstApplied = await repository.create(
      createApplication("applied-1", "applied"),
    );
    const inProgress = await repository.create(
      createApplication("progress-1", "in_progress"),
    );
    const secondApplied = await repository.create(
      createApplication("applied-2", "applied"),
    );

    expect(firstApplied.position).toBe(0);
    expect(inProgress.position).toBe(0);
    expect(secondApplied.position).toBe(1);
    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-1", position: 0 },
      { id: "applied-2", position: 1 },
      { id: "progress-1", position: 0 },
    ]);
  });

  it("recupera uma candidatura depois de reabrir o banco", async () => {
    const databaseName = `totion-test-${crypto.randomUUID()}`;
    const firstDatabase = new TotionDatabase(databaseName);
    databases.push(firstDatabase);
    const firstRepository = new DexieApplicationsRepository(firstDatabase);

    await firstRepository.create(createApplication("persisted", "closed"));
    firstDatabase.close();

    const reopenedDatabase = new TotionDatabase(databaseName);
    databases.push(reopenedDatabase);
    const reopenedRepository = new DexieApplicationsRepository(
      reopenedDatabase,
    );

    await expect(reopenedRepository.list()).resolves.toMatchObject([
      { id: "persisted", status: "closed", position: 0 },
    ]);
  });
});
