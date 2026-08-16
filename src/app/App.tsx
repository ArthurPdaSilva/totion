import { lazy, Suspense, useDeferredValue, useRef, useState } from "react";
import brandIconUrl from "../../assets/favicon.svg";
import { database } from "../database/database";
import {
  type ApplicationsRepository,
  DexieApplicationsRepository,
} from "../database/repositories/applicationsRepository";
import {
  DexieWorkspaceRepository,
  type WorkspaceRepository,
} from "../database/repositories/workspaceRepository";
import { ApplicationBoard } from "../features/applications/components/ApplicationBoard";
import { ApplicationFormDialog } from "../features/applications/components/ApplicationFormDialog";
import { DeleteApplicationDialog } from "../features/applications/components/DeleteApplicationDialog";
import { APPLICATION_STATUS_LABELS } from "../features/applications/constants/applicationStatuses";
import { useApplications } from "../features/applications/hooks/useApplications";
import type { ApplicationBackup } from "../features/applications/services/applicationBackup";
import type { Application } from "../features/applications/types/application";
import { JobPortalsColumn } from "../features/resources/components/JobPortalsColumn";
import { WorkspaceNotesColumn } from "../features/resources/components/WorkspaceNotesColumn";
import { useWorkspaceResources } from "../features/resources/hooks/useWorkspaceResources";
import { ThemeToggle } from "../shared/components/ThemeToggle";
import { useTheme } from "../shared/hooks/useTheme";
import { Notifications } from "../shared/notifications";
import {
  includesSearchTerm,
  normalizeSearchText,
} from "../shared/utils/search";

const defaultRepository = new DexieApplicationsRepository(database);
const defaultWorkspaceRepository = new DexieWorkspaceRepository(database);
const emptyWorkspaceRepository: WorkspaceRepository = {
  async listJobPortals() {
    return [];
  },
  async listNotes() {
    return [];
  },
  async createJobPortal() {
    throw new Error("Repository de workspace não configurado");
  },
  async updateJobPortal() {
    throw new Error("Repository de workspace não configurado");
  },
  async deleteJobPortal() {
    throw new Error("Repository de workspace não configurado");
  },
  async createNote() {
    throw new Error("Repository de workspace não configurado");
  },
  async updateNote() {
    throw new Error("Repository de workspace não configurado");
  },
  async deleteNote() {
    throw new Error("Repository de workspace não configurado");
  },
  async restore() {
    throw new Error("Repository de workspace não configurado");
  },
};
const BackupApplicationsDialog = lazy(() =>
  import("../features/applications/components/BackupApplicationsDialog").then(
    (module) => ({ default: module.BackupApplicationsDialog }),
  ),
);

type AppProps = {
  repository?: ApplicationsRepository;
  workspaceRepository?: WorkspaceRepository;
};

export function App({
  repository = defaultRepository,
  workspaceRepository,
}: AppProps) {
  const resolvedWorkspaceRepository =
    workspaceRepository ??
    (repository === defaultRepository
      ? defaultWorkspaceRepository
      : emptyWorkspaceRepository);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [applicationToEdit, setApplicationToEdit] =
    useState<Application | null>(null);
  const [applicationToDelete, setApplicationToDelete] =
    useState<Application | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const backupButtonRef = useRef<HTMLButtonElement>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const {
    applications,
    status,
    addApplication,
    beginApplicationMove,
    cancelApplicationMove,
    commitApplicationMove,
    editApplication,
    previewApplicationMove,
    removeApplication,
    reload,
    acceptRestoredApplications,
  } = useApplications(repository);
  const {
    jobPortals,
    notes,
    status: resourcesStatus,
    addJobPortal,
    editJobPortal,
    removeJobPortal,
    addNote,
    editNote,
    removeNote,
    acceptRestoredResources,
    reload: reloadResources,
  } = useWorkspaceResources(resolvedWorkspaceRepository);
  const normalizedSearchQuery = normalizeSearchText(deferredSearchQuery);
  const isSearchActive = normalizedSearchQuery.length > 0;
  const filteredApplications = isSearchActive
    ? applications.filter((application) =>
        includesSearchTerm(
          [
            application.name,
            application.jobUrl,
            application.notes,
            APPLICATION_STATUS_LABELS[application.status],
          ],
          normalizedSearchQuery,
        ),
      )
    : undefined;
  const filteredJobPortals = isSearchActive
    ? jobPortals.filter((jobPortal) =>
        includesSearchTerm(
          [jobPortal.name, jobPortal.url],
          normalizedSearchQuery,
        ),
      )
    : jobPortals;
  const filteredNotes = isSearchActive
    ? notes.filter((note) =>
        includesSearchTerm([note.content], normalizedSearchQuery),
      )
    : notes;
  const searchResultCount =
    (filteredApplications?.length ?? applications.length) +
    filteredJobPortals.length +
    filteredNotes.length;

  function closeForm() {
    setIsFormOpen(false);
    queueMicrotask(() => createButtonRef.current?.focus());
  }

  async function restoreBackup(backup: ApplicationBackup) {
    await resolvedWorkspaceRepository.restore({
      applications: backup.applications,
      jobPortals: backup.jobPortals,
      notes: backup.notes,
    });
    acceptRestoredApplications(backup.applications);
    acceptRestoredResources(backup.jobPortals, backup.notes);
  }

  function closeBackup() {
    setIsBackupOpen(false);
    queueMicrotask(() => backupButtonRef.current?.focus());
  }

  function requestApplicationEdit(
    application: Application,
    trigger: HTMLButtonElement,
  ) {
    editButtonRef.current = trigger;
    setApplicationToEdit(application);
  }

  function closeApplicationEdit() {
    const applicationId = applicationToEdit?.id;
    setApplicationToEdit(null);
    setTimeout(() => {
      const currentEditButton = applicationId
        ? document.getElementById(`edit-application-${applicationId}`)
        : null;

      if (currentEditButton instanceof HTMLButtonElement) {
        currentEditButton.focus();
      } else if (editButtonRef.current?.isConnected) {
        editButtonRef.current.focus();
      } else {
        createButtonRef.current?.focus();
      }
    }, 0);
  }

  function requestApplicationDeletion(
    application: Application,
    trigger: HTMLButtonElement,
  ) {
    deleteButtonRef.current = trigger;
    setApplicationToDelete(application);
  }

  function cancelApplicationDeletion() {
    setApplicationToDelete(null);
    queueMicrotask(() => deleteButtonRef.current?.focus());
  }

  function finishApplicationDeletion() {
    const deletedApplicationStatus = applicationToDelete?.status;
    setApplicationToDelete(null);
    deleteButtonRef.current = null;
    queueMicrotask(() => {
      const columnHeading = deletedApplicationStatus
        ? document.getElementById(`column-${deletedApplicationStatus}`)
        : null;

      if (columnHeading instanceof HTMLElement) {
        columnHeading.focus();
      } else {
        createButtonRef.current?.focus();
      }
    });
  }

  return (
    <div className="min-h-screen">
      <header className="relative z-10 border-b border-line/80 bg-panel/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <a
            className="flex items-center gap-3 rounded-button"
            href="/"
            aria-label="Totion, início"
          >
            <img
              className="h-10 w-10 rounded-card shadow-card"
              src={brandIconUrl}
              width="40"
              height="40"
              alt=""
            />
            <span>
              <span className="block font-display text-xl leading-5 font-bold tracking-[-0.025em]">
                Totion
              </span>
              <span className="hidden text-[0.6875rem] font-bold tracking-[0.12em] text-muted uppercase sm:block">
                Radar de oportunidades
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              ref={backupButtonRef}
              type="button"
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-button border border-line-strong bg-card px-3 text-sm font-bold text-ink transition hover:bg-canvas sm:px-4"
              onClick={() => setIsBackupOpen(true)}
              aria-label="Backup"
            >
              <span className="hidden sm:inline">Backup</span>
              <BackupIcon />
            </button>
            <button
              ref={createButtonRef}
              type="button"
              aria-label="Nova candidatura"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-brand px-3 text-sm font-bold text-white shadow-card transition duration-200 ease-standard hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-card-hover motion-reduce:transform-none sm:px-5"
              onClick={() => setIsFormOpen(true)}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                +
              </span>
              <span className="hidden sm:inline">Nova candidatura</span>
              <span className="sm:hidden">Nova</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-content px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:px-10">
        <section className="mb-9 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.17em] text-brand uppercase">
              Seu processo, com clareza
            </p>
            <h1 className="max-w-3xl font-display text-4xl leading-[1.03] font-bold tracking-[-0.04em] text-ink sm:text-5xl lg:text-6xl">
              Toda oportunidade merece um próximo passo.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Registre suas candidaturas e acompanhe o caminho entre o primeiro
              envio e a decisão final.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-card border border-line bg-panel/80 px-4 py-3 shadow-card">
            <span
              className="h-2.5 w-2.5 rounded-full bg-brand"
              aria-hidden="true"
            />
            <p className="text-sm text-muted">
              <strong className="text-ink tabular-nums">
                {applications.length}
              </strong>{" "}
              {applications.length === 1
                ? "oportunidade registrada"
                : "oportunidades registradas"}
            </p>
          </div>
        </section>

        <section className="mb-7" aria-labelledby="universal-search-label">
          <label
            id="universal-search-label"
            className="text-sm font-bold text-ink"
            htmlFor="universal-search"
          >
            Buscar em todo o Totion
          </label>
          <div className="relative mt-2 max-w-2xl">
            <span
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            >
              <SearchIcon />
            </span>
            <input
              id="universal-search"
              type="search"
              className="min-h-12 w-full rounded-card border border-line-strong bg-card py-3 pr-12 pl-11 text-sm text-ink shadow-card placeholder:text-subtle focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Candidaturas, portais e anotações..."
            />
          </div>
          {isSearchActive ? (
            <p className="mt-2 text-sm text-muted" role="status">
              {searchResultCount}{" "}
              {searchResultCount === 1
                ? "resultado encontrado"
                : "resultados encontrados"}
              . O movimento de cards fica pausado durante a busca.
            </p>
          ) : null}
        </section>

        {status === "loading" ? (
          <p className="sr-only" role="status">
            Carregando candidaturas...
          </p>
        ) : null}

        {status === "error" ? (
          <div
            className="mb-5 flex flex-col items-start justify-between gap-4 rounded-card border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger sm:flex-row sm:items-center"
            role="alert"
          >
            <p>Não foi possível carregar suas candidaturas. Tente novamente.</p>
            <button
              type="button"
              className="min-h-10 rounded-button border border-danger/30 bg-card px-4 font-bold transition hover:border-danger"
              onClick={reload}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {resourcesStatus === "error" ? (
          <div
            className="mb-5 flex flex-col items-start justify-between gap-4 rounded-card border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger sm:flex-row sm:items-center"
            role="alert"
          >
            <p>Não foi possível carregar portais e anotações.</p>
            <button
              type="button"
              className="min-h-10 rounded-button border border-danger/30 bg-card px-4 font-bold"
              onClick={reloadResources}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        <ApplicationBoard
          applications={applications}
          filteredApplications={filteredApplications}
          leadingColumn={
            <JobPortalsColumn
              jobPortals={filteredJobPortals}
              totalCount={jobPortals.length}
              isFiltered={isSearchActive}
              onAdd={addJobPortal}
              onEdit={editJobPortal}
              onDelete={removeJobPortal}
            />
          }
          trailingColumn={
            <WorkspaceNotesColumn
              notes={filteredNotes}
              totalCount={notes.length}
              isFiltered={isSearchActive}
              onAdd={addNote}
              onEdit={editNote}
              onDelete={removeNote}
            />
          }
          isLoading={status === "loading" || resourcesStatus === "loading"}
          onRequestEdit={requestApplicationEdit}
          onRequestDelete={requestApplicationDeletion}
          onMoveStart={beginApplicationMove}
          onMovePreview={previewApplicationMove}
          onMoveCommit={commitApplicationMove}
          onMoveCancel={cancelApplicationMove}
        />
      </main>

      {isFormOpen ? (
        <ApplicationFormDialog onClose={closeForm} onSubmit={addApplication} />
      ) : null}

      {isBackupOpen ? (
        <Suspense
          fallback={
            <p className="sr-only" role="status">
              Carregando backup...
            </p>
          }
        >
          <BackupApplicationsDialog
            applications={applications}
            jobPortals={jobPortals}
            notes={notes}
            onClose={closeBackup}
            onRestore={restoreBackup}
          />
        </Suspense>
      ) : null}

      {applicationToEdit ? (
        <ApplicationFormDialog
          application={applicationToEdit}
          onClose={closeApplicationEdit}
          onSubmit={(input) => editApplication(applicationToEdit.id, input)}
        />
      ) : null}

      {applicationToDelete ? (
        <DeleteApplicationDialog
          application={applicationToDelete}
          onCancel={cancelApplicationDeletion}
          onDelete={() => removeApplication(applicationToDelete.id)}
          onDeleted={finishApplicationDeletion}
        />
      ) : null}
      <Notifications />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BackupIcon() {
  return (
    <svg
      className="sm:hidden"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 4.5h11l3 3v12H5v-15ZM8 4.5v5h7v-5M8 19.5v-6h8v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
