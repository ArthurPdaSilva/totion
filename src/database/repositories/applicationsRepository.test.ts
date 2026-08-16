import { afterEach, describe, expect, it, vi } from "vitest";
import { TotionDatabase } from "../database";
import {
  type ApplicationUpdate,
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

function createUpdate(
  status: ApplicationUpdate["status"],
  overrides: Partial<ApplicationUpdate> = {},
): ApplicationUpdate {
  return {
    name: "Vaga atualizada",
    status,
    appliedAt: "2026-08-17",
    jobUrl: "https://empresa.example/vaga",
    notes: "Dados atualizados",
    updatedAt: "2026-08-17T09:00:00.000Z",
    ...overrides,
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

  it("importa em lote de forma transacional e ignora duplicatas", async () => {
    const database = createDatabase();
    const repository = new DexieApplicationsRepository(database);
    const first = createApplication("imported-1", "applied");
    const duplicate = {
      ...createApplication("imported-duplicate", "closed"),
      name: first.name,
      appliedAt: first.appliedAt,
      jobUrl: first.jobUrl,
    };

    await expect(
      repository.createMany([first, duplicate]),
    ).resolves.toMatchObject([
      { id: "imported-1", status: "applied", position: 0 },
    ]);
    await expect(repository.createMany([first])).resolves.toEqual([]);
    await expect(repository.list()).resolves.toMatchObject([
      { id: "imported-1", status: "applied", position: 0 },
    ]);

    vi.spyOn(database.applications, "bulkAdd").mockRejectedValueOnce(
      new Error("Falha sintética na importação"),
    );
    await expect(
      repository.createMany([
        createApplication("imported-2", "applied"),
        createApplication("imported-3", "closed"),
      ]),
    ).rejects.toThrow("Falha sintética na importação");
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it("atualiza os dados sem alterar identidade, criação ou posição", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());
    await repository.create(createApplication("applied-1", "applied"));

    await repository.updateById(
      "applied-1",
      createUpdate("applied", { name: "Pessoa Desenvolvedora React" }),
    );

    await expect(repository.list()).resolves.toMatchObject([
      {
        id: "applied-1",
        name: "Pessoa Desenvolvedora React",
        status: "applied",
        position: 0,
        createdAt: "2026-08-16T12:00:00.000Z",
        updatedAt: "2026-08-17T09:00:00.000Z",
      },
    ]);
  });

  it("move para o fim do novo status e normaliza a coluna de origem", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());
    const updatedAt = "2026-08-17T09:00:00.000Z";

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));
    await repository.create(createApplication("applied-3", "applied"));
    await repository.create(createApplication("progress-1", "in_progress"));

    await repository.updateById(
      "applied-2",
      createUpdate("in_progress", { updatedAt }),
    );

    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-1", status: "applied", position: 0 },
      { id: "applied-3", status: "applied", position: 1, updatedAt },
      { id: "progress-1", status: "in_progress", position: 0 },
      {
        id: "applied-2",
        status: "in_progress",
        position: 1,
        updatedAt,
      },
    ]);
  });

  it("restaura a edição quando a mudança de status falha", async () => {
    const database = createDatabase();
    const repository = new DexieApplicationsRepository(database);
    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("closed-1", "closed"));
    vi.spyOn(database.applications, "bulkPut").mockRejectedValueOnce(
      new Error("Falha sintética na movimentação"),
    );

    await expect(
      repository.updateById("applied-1", createUpdate("closed")),
    ).rejects.toThrow("Falha sintética na movimentação");
    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-1", status: "applied", position: 0 },
      { id: "closed-1", status: "closed", position: 0 },
    ]);
  });

  it("serializa movimentos concorrentes para o mesmo destino vazio", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));

    await Promise.all([
      repository.updateById("applied-1", createUpdate("closed")),
      repository.updateById("applied-2", createUpdate("closed")),
    ]);

    const closedApplications = (await repository.list()).filter(
      (application) => application.status === "closed",
    );
    expect(closedApplications).toHaveLength(2);
    expect(
      closedApplications.map((application) => application.position),
    ).toEqual([0, 1]);
  });

  it("normaliza posições existentes antes de inserir no fim do destino", async () => {
    const database = createDatabase();
    const repository = new DexieApplicationsRepository(database);
    const updatedAt = "2026-08-17T09:00:00.000Z";

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("progress-1", "in_progress"));
    await repository.create(createApplication("progress-2", "in_progress"));
    await database.applications.update("progress-2", { position: 4 });

    await repository.updateById(
      "applied-1",
      createUpdate("in_progress", { updatedAt }),
    );

    await expect(repository.list()).resolves.toMatchObject([
      { id: "progress-1", status: "in_progress", position: 0 },
      { id: "progress-2", status: "in_progress", position: 1, updatedAt },
      { id: "applied-1", status: "in_progress", position: 2, updatedAt },
    ]);
  });

  it("persiste reordenação dentro da mesma coluna", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());
    const updatedAt = "2026-08-17T09:00:00.000Z";

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));
    await repository.create(createApplication("applied-3", "applied"));

    await repository.moveById("applied-1", "applied", 2, updatedAt);

    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-2", position: 0, updatedAt },
      { id: "applied-3", position: 1, updatedAt },
      { id: "applied-1", position: 2, updatedAt },
    ]);
  });

  it("persiste movimento para uma coluna vazia", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));
    await repository.moveById(
      "applied-1",
      "closed",
      0,
      "2026-08-17T09:00:00.000Z",
    );

    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-2", status: "applied", position: 0 },
      { id: "applied-1", status: "closed", position: 0 },
    ]);
  });

  it("restaura a ordem quando a persistência do movimento falha", async () => {
    const database = createDatabase();
    const repository = new DexieApplicationsRepository(database);
    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));
    vi.spyOn(database.applications, "bulkPut").mockRejectedValueOnce(
      new Error("Falha sintética no movimento"),
    );

    await expect(
      repository.moveById(
        "applied-1",
        "applied",
        1,
        "2026-08-17T09:00:00.000Z",
      ),
    ).rejects.toThrow("Falha sintética no movimento");
    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-1", position: 0 },
      { id: "applied-2", position: 1 },
    ]);
  });

  it("exclui e normaliza as posições restantes na mesma coluna", async () => {
    const repository = new DexieApplicationsRepository(createDatabase());
    const reorderedAt = "2026-08-17T09:00:00.000Z";

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));
    await repository.create(createApplication("applied-3", "applied"));
    await repository.create(createApplication("closed-1", "closed"));

    await repository.deleteById("applied-2", reorderedAt);

    await expect(repository.list()).resolves.toMatchObject([
      {
        id: "applied-1",
        position: 0,
        updatedAt: "2026-08-16T12:00:00.000Z",
      },
      { id: "applied-3", position: 1, updatedAt: reorderedAt },
      {
        id: "closed-1",
        position: 0,
        updatedAt: "2026-08-16T12:00:00.000Z",
      },
    ]);
  });

  it("restaura a exclusão quando a normalização de posições falha", async () => {
    const database = createDatabase();
    const repository = new DexieApplicationsRepository(database);

    await repository.create(createApplication("applied-1", "applied"));
    await repository.create(createApplication("applied-2", "applied"));
    vi.spyOn(database.applications, "bulkPut").mockRejectedValueOnce(
      new Error("Falha sintética na normalização"),
    );

    await expect(
      repository.deleteById("applied-1", "2026-08-17T09:00:00.000Z"),
    ).rejects.toThrow("Falha sintética na normalização");
    await expect(repository.list()).resolves.toMatchObject([
      { id: "applied-1", position: 0 },
      { id: "applied-2", position: 1 },
    ]);
  });
});
