import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type {
  ApplicationsRepository,
  ApplicationUpdate,
  ApplicationWithoutPosition,
} from "../database/repositories/applicationsRepository";
import { createApplicationBackup } from "../features/applications/services/applicationBackup";
import type { Application } from "../features/applications/types/application";
import { App } from "./App";

class MemoryApplicationsRepository implements ApplicationsRepository {
  applications: Application[] = [];
  shouldFailCreation = false;
  shouldFailUpdate = false;
  shouldFailDeletion = false;
  shouldFailMove = false;
  shouldFailReplacement = false;

  async list() {
    return [...this.applications];
  }

  async create(application: ApplicationWithoutPosition) {
    if (this.shouldFailCreation) {
      throw new Error("Falha sintética");
    }

    const position = this.applications.filter(
      (currentApplication) => currentApplication.status === application.status,
    ).length;
    const persistedApplication = { ...application, position };
    this.applications.push(persistedApplication);

    return persistedApplication;
  }

  async replaceAll(applications: Application[]) {
    if (this.shouldFailReplacement) {
      throw new Error("Falha sintética");
    }

    this.applications = [...applications];
  }

  async updateById(id: string, update: ApplicationUpdate) {
    if (this.shouldFailUpdate) {
      throw new Error("Falha sintética");
    }

    const currentApplication = this.applications.find(
      (application) => application.id === id,
    );

    if (!currentApplication) {
      throw new Error("Candidatura não encontrada");
    }

    const updatedApplication: Application = {
      ...currentApplication,
      ...update,
      position:
        currentApplication.status === update.status
          ? currentApplication.position
          : this.applications.filter(
              (application) => application.status === update.status,
            ).length,
    };
    this.applications = this.applications.map((application) =>
      application.id === id ? updatedApplication : application,
    );

    return [updatedApplication];
  }

  async moveById(
    id: string,
    targetStatus: Application["status"],
    targetPosition: number,
    updatedAt: string,
  ) {
    if (this.shouldFailMove) {
      throw new Error("Falha sintética");
    }

    const currentApplication = this.applications.find(
      (application) => application.id === id,
    );

    if (!currentApplication) {
      throw new Error("Candidatura não encontrada");
    }

    const movedApplication = {
      ...currentApplication,
      status: targetStatus,
      position: targetPosition,
      updatedAt,
    };
    this.applications = this.applications.map((application) =>
      application.id === id ? movedApplication : application,
    );
    return [movedApplication];
  }

  async deleteById(id: string, reorderedAt: string) {
    if (this.shouldFailDeletion) {
      throw new Error("Falha sintética");
    }

    const deletedApplication = this.applications.find(
      (application) => application.id === id,
    );
    this.applications = this.applications.filter(
      (application) => application.id !== id,
    );

    if (!deletedApplication) {
      return [];
    }

    const reorderedApplications: Application[] = [];
    this.applications = this.applications.map((application) => {
      if (application.status !== deletedApplication.status) {
        return application;
      }

      const position = this.applications.filter(
        (candidate) =>
          candidate.status === application.status &&
          candidate.position < application.position,
      ).length;

      if (application.position === position) {
        return application;
      }

      const reorderedApplication = {
        ...application,
        position,
        updatedAt: reorderedAt,
      };
      reorderedApplications.push(reorderedApplication);
      return reorderedApplication;
    });

    return reorderedApplications;
  }
}

function createPersistedApplication(
  overrides: Partial<Application> = {},
): Application {
  return {
    id: "application-1",
    name: "Desenvolvedor Back-end",
    status: "applied",
    appliedAt: "2026-08-16",
    jobUrl: null,
    notes: null,
    position: 0,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("App", () => {
  it("renderiza as três colunas e cria uma candidatura persistida", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    const progressColumn = screen.getByRole("region", { name: "Em andamento" });
    const closedColumn = screen.getByRole("region", { name: "Encerrada" });

    expect(
      within(appliedColumn).getByLabelText("0 candidaturas"),
    ).toBeInTheDocument();
    expect(
      within(progressColumn).getByLabelText("0 candidaturas"),
    ).toBeInTheDocument();
    expect(
      within(closedColumn).getByLabelText("0 candidaturas"),
    ).toBeInTheDocument();

    const createButton = screen.getByRole("button", {
      name: "Nova candidatura",
    });
    await user.click(createButton);

    expect(
      screen.getByRole("dialog", { name: "Adicionar candidatura" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Salvar candidatura" }),
    );
    expect(
      await screen.findByText("Informe o nome da vaga"),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Nome da vaga"),
      "Desenvolvedor React",
    );
    await user.selectOptions(screen.getByLabelText("Status"), "in_progress");
    await user.clear(screen.getByLabelText("Aplicado em"));
    await user.type(screen.getByLabelText("Aplicado em"), "2026-08-16");
    await user.type(
      screen.getByLabelText(/Link da vaga/),
      "https://empresa.example/vagas/react",
    );
    await user.type(
      screen.getByLabelText(/Anotações/),
      "Retorno esperado na próxima semana",
    );
    await user.click(
      screen.getByRole("button", { name: "Salvar candidatura" }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Candidatura adicionada ao quadro."),
    ).toBeInTheDocument();
    expect(createButton).toHaveFocus();

    const createdCard = within(progressColumn).getByRole("article");
    expect(
      within(createdCard).getByText("Desenvolvedor React"),
    ).toBeInTheDocument();
    expect(within(createdCard).getByText("16/08/2026")).toBeInTheDocument();
    expect(
      within(progressColumn).getByLabelText("1 candidatura"),
    ).toBeInTheDocument();
    expect(within(createdCard).getByText("Com anotações")).toBeInTheDocument();
    expect(
      within(createdCard).getByRole("button", {
        name: "Mover candidatura Desenvolvedor React",
      }),
    ).toBeInTheDocument();

    const jobLink = within(createdCard).getByRole("link", {
      name: "Abrir vaga Desenvolvedor React em uma nova aba",
    });
    expect(jobLink).toHaveAttribute("target", "_blank");
    expect(jobLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(repository.applications).toHaveLength(1);
  });

  it("renderiza cinco cards por coluna e carrega o próximo lote", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = Array.from({ length: 7 }, (_, position) =>
      createPersistedApplication({
        id: `application-${position + 1}`,
        name: `Vaga ${position + 1}`,
        position,
      }),
    );
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    expect(within(appliedColumn).getAllByRole("article")).toHaveLength(5);
    expect(
      within(appliedColumn).getByLabelText("7 candidaturas"),
    ).toBeInTheDocument();
    expect(
      within(appliedColumn).getByText("Mostrando 5 de 7"),
    ).toBeInTheDocument();
    expect(within(appliedColumn).queryByText("Vaga 6")).not.toBeInTheDocument();

    await user.click(
      within(appliedColumn).getByRole("button", { name: "Carregar mais" }),
    );

    expect(within(appliedColumn).getAllByRole("article")).toHaveLength(7);
    expect(within(appliedColumn).getByText("Vaga 7")).toBeInTheDocument();
    expect(
      within(appliedColumn).queryByText(/Mostrando/),
    ).not.toBeInTheDocument();
  });

  it("mantém o card ativo montado ao atravessar o limite do lote", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = Array.from({ length: 6 }, (_, position) =>
      createPersistedApplication({
        id: `application-${position + 1}`,
        name: `Vaga ${position + 1}`,
        position,
      }),
    );
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    const fifthMoveButton = within(appliedColumn).getByRole("button", {
      name: "Mover candidatura Vaga 5",
    });
    fifthMoveButton.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");

    expect(within(appliedColumn).getAllByRole("article")).toHaveLength(6);
    expect(fifthMoveButton).toHaveFocus();
    expect(within(appliedColumn).getByText("Vaga 6")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(await screen.findByText("Movimento salvo.")).toBeInTheDocument();
    expect(within(appliedColumn).getAllByRole("article")).toHaveLength(6);
  });

  it("mantém o formulário preenchido quando a persistência falha", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.shouldFailCreation = true;
    render(<App repository={repository} />);

    await screen.findByRole("region", { name: "Aplicada" });
    await user.click(screen.getByRole("button", { name: "Nova candidatura" }));

    const nameInput = screen.getByLabelText("Nome da vaga");
    await user.type(nameInput, "Analista de Sistemas");
    await user.click(
      screen.getByRole("button", { name: "Salvar candidatura" }),
    );

    expect(
      await screen.findByText(/Não foi possível salvar a candidatura/),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameInput).toHaveValue("Analista de Sistemas");
    expect(repository.applications).toHaveLength(0);
  });

  it("revisa e restaura um backup próprio do Totion", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [
      createPersistedApplication({ name: "Anterior" }),
    ];
    render(<App repository={repository} />);

    await screen.findByRole("region", { name: "Aplicada" });
    const backupButton = screen.getByRole("button", { name: "Backup" });
    await user.click(backupButton);
    const backupApplications = [
      createPersistedApplication({
        id: "restored-applied",
        name: "Pessoa Front-end",
      }),
      createPersistedApplication({
        id: "restored-progress",
        name: "Pessoa de Produto",
        status: "in_progress",
      }),
      createPersistedApplication({
        id: "restored-closed",
        name: "Pessoa de Dados",
        status: "closed",
      }),
    ];
    const backupFile = new File(
      [createApplicationBackup(backupApplications).content],
      "candidaturas-sinteticas.totion",
      { type: "application/json" },
    );
    await user.upload(
      await screen.findByLabelText("Arquivo Totion"),
      backupFile,
    );

    expect(await screen.findByText("Conteúdo do backup")).toBeInTheDocument();
    const restoreButton = screen.getByRole("button", {
      name: "Restaurar 3 candidaturas",
    });
    expect(restoreButton).toBeDisabled();
    await user.click(
      screen.getByLabelText(
        "Entendo que o quadro atual será substituído por este backup.",
      ),
    );
    await user.click(restoreButton);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole("region", { name: "Aplicada" })).getByText(
        "Pessoa Front-end",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Em andamento" })).getByText(
        "Pessoa de Produto",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Encerrada" })).getByText(
        "Pessoa de Dados",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Anterior")).not.toBeInTheDocument();
    expect(repository.applications).toEqual(backupApplications);
    expect(backupButton).toHaveFocus();
  });

  it("exibe os detalhes e edita uma candidatura", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [
      createPersistedApplication({
        appliedAt: "2025-02-03",
        jobUrl: "https://empresa.example/vaga-original",
        notes: "Contato inicial realizado",
      }),
    ];
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    const closedColumn = screen.getByRole("region", { name: "Encerrada" });
    await user.click(
      within(appliedColumn).getByRole("button", {
        name: "Editar candidatura Desenvolvedor Back-end",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "Editar candidatura" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da vaga")).toHaveValue(
      "Desenvolvedor Back-end",
    );
    expect(screen.getByLabelText("Status")).toHaveValue("applied");
    expect(screen.getByLabelText("Aplicado em")).toHaveValue("2025-02-03");
    expect(screen.getByLabelText(/Link da vaga/)).toHaveValue(
      "https://empresa.example/vaga-original",
    );
    expect(screen.getByLabelText(/Anotações/)).toHaveValue(
      "Contato inicial realizado",
    );

    await user.clear(screen.getByLabelText("Nome da vaga"));
    await user.type(
      screen.getByLabelText("Nome da vaga"),
      "Engenheiro de Software",
    );
    await user.selectOptions(screen.getByLabelText("Status"), "closed");
    await user.clear(screen.getByLabelText(/Anotações/));
    await user.type(screen.getByLabelText(/Anotações/), "Processo finalizado");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(
      await screen.findByText("Alterações salvas no quadro."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      within(appliedColumn).queryByRole("article"),
    ).not.toBeInTheDocument();
    expect(
      within(closedColumn).getByText("Engenheiro de Software"),
    ).toBeInTheDocument();
    expect(
      within(closedColumn).getByLabelText("1 candidatura"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(closedColumn).getByRole("button", {
          name: "Editar candidatura Engenheiro de Software",
        }),
      ).toHaveFocus(),
    );
    expect(repository.applications[0]).toMatchObject({
      id: "application-1",
      name: "Engenheiro de Software",
      status: "closed",
      appliedAt: "2025-02-03",
      notes: "Processo finalizado",
      createdAt: "2026-08-16T12:00:00.000Z",
    });
    expect(repository.applications[0]?.updatedAt).not.toBe(
      "2026-08-16T12:00:00.000Z",
    );
  });

  it("mantém os dados editados quando a atualização falha", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [createPersistedApplication()];
    repository.shouldFailUpdate = true;
    render(<App repository={repository} />);

    await user.click(
      await screen.findByRole("button", {
        name: "Editar candidatura Desenvolvedor Back-end",
      }),
    );
    const nameInput = screen.getByLabelText("Nome da vaga");
    await user.clear(nameInput);
    await user.type(nameInput, "Desenvolvedor Full Stack");
    await user.selectOptions(screen.getByLabelText("Status"), "closed");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(
      await screen.findByText(/Não foi possível atualizar a candidatura/),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameInput).toHaveValue("Desenvolvedor Full Stack");
    expect(screen.getByLabelText("Status")).toHaveValue("closed");
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeEnabled();
    expect(repository.applications[0]?.name).toBe("Desenvolvedor Back-end");
    expect(repository.applications[0]?.status).toBe("applied");

    repository.shouldFailUpdate = false;
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen
        .getByRole("region", { name: "Encerrada" })
        .getElementsByTagName("article"),
    ).toHaveLength(1);
    expect(repository.applications[0]).toMatchObject({
      name: "Desenvolvedor Full Stack",
      status: "closed",
    });
  });

  it("inicia e cancela o movimento pelo teclado", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [createPersistedApplication()];
    render(<App repository={repository} />);

    const moveButton = await screen.findByRole("button", {
      name: "Mover candidatura Desenvolvedor Back-end",
    });
    moveButton.focus();
    await user.keyboard(" ");

    expect(
      await screen.findByText(
        "Você iniciou o movimento de Desenvolvedor Back-end.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: "Editar candidatura Desenvolvedor Back-end",
      }),
    ).toHaveLength(1);

    await user.keyboard("{Escape}");
    expect(
      await screen.findByText(
        "Movimento cancelado. A ordem anterior foi restaurada.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Desenvolvedor Back-end")).toHaveLength(1);
    expect(repository.applications).toHaveLength(1);
  });

  it("move pelo teclado para uma coluna vazia e mantém o foco", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [createPersistedApplication()];
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    const progressColumn = screen.getByRole("region", {
      name: "Em andamento",
    });
    const moveButton = within(appliedColumn).getByRole("button", {
      name: "Mover candidatura Desenvolvedor Back-end",
    });
    moveButton.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");

    expect(
      within(appliedColumn).queryByRole("article"),
    ).not.toBeInTheDocument();
    const destinationHandle = within(progressColumn).getByRole("button", {
      name: "Mover candidatura Desenvolvedor Back-end",
    });
    expect(destinationHandle).toHaveFocus();
    expect(
      screen.getByText("Posição 1 de 1 em Em andamento."),
    ).toBeInTheDocument();

    await user.keyboard(" ");
    expect(await screen.findByText("Movimento salvo.")).toBeInTheDocument();
    expect(repository.applications[0]).toMatchObject({
      status: "in_progress",
      position: 0,
    });
  });

  it("restaura visualmente a ordem quando o movimento falha", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [
      createPersistedApplication({ id: "application-1", name: "Primeira" }),
      createPersistedApplication({
        id: "application-2",
        name: "Segunda",
        position: 1,
      }),
    ];
    repository.shouldFailMove = true;
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    const moveButton = within(appliedColumn).getByRole("button", {
      name: "Mover candidatura Primeira",
    });
    moveButton.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    expect(
      within(appliedColumn)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Segunda", "Primeira"]);

    await user.keyboard(" ");

    expect(
      await screen.findByText(
        "Não foi possível salvar. A ordem anterior foi restaurada.",
      ),
    ).toBeInTheDocument();
    expect(
      within(appliedColumn)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Primeira", "Segunda"]);
    expect(repository.applications).toMatchObject([
      { id: "application-1", position: 0 },
      { id: "application-2", position: 1 },
    ]);
  });

  it("solicita confirmação e exclui uma candidatura definitivamente", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [createPersistedApplication()];
    render(<App repository={repository} />);

    const appliedColumn = await screen.findByRole("region", {
      name: "Aplicada",
    });
    const deleteButton = within(appliedColumn).getByRole("button", {
      name: "Excluir candidatura Desenvolvedor Back-end",
    });

    await user.click(deleteButton);
    const confirmationDialog = screen.getByRole("dialog", {
      name: "Excluir candidatura?",
    });
    expect(
      within(confirmationDialog).getByText("Desenvolvedor Back-end"),
    ).toBeInTheDocument();

    fireEvent(confirmationDialog, new Event("cancel", { cancelable: true }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(deleteButton).toHaveFocus();
    expect(repository.applications).toHaveLength(1);

    await user.click(deleteButton);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Excluir candidatura",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText("Candidatura excluída do quadro."),
    ).toBeInTheDocument();
    expect(
      within(appliedColumn).queryByRole("article"),
    ).not.toBeInTheDocument();
    expect(
      within(appliedColumn).getByLabelText("0 candidaturas"),
    ).toBeInTheDocument();
    expect(
      within(appliedColumn).getByRole("heading", { name: "Aplicada" }),
    ).toHaveFocus();
    expect(repository.applications).toHaveLength(0);
  });

  it("mantém o card quando a exclusão falha", async () => {
    const user = userEvent.setup();
    const repository = new MemoryApplicationsRepository();
    repository.applications = [createPersistedApplication()];
    repository.shouldFailDeletion = true;
    render(<App repository={repository} />);

    const deleteButton = await screen.findByRole("button", {
      name: "Excluir candidatura Desenvolvedor Back-end",
    });
    await user.click(deleteButton);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Excluir candidatura",
      }),
    );

    expect(
      await screen.findByText(/Não foi possível excluir a candidatura/),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    );
    expect(
      screen.getByRole("button", { name: "Excluir candidatura" }),
    ).toBeEnabled();
    expect(repository.applications).toHaveLength(1);

    repository.shouldFailDeletion = false;
    await user.click(
      screen.getByRole("button", { name: "Excluir candidatura" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(deleteButton).not.toBeInTheDocument();
    expect(repository.applications).toHaveLength(0);
  });
});
