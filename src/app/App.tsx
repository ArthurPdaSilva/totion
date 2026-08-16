import { useRef, useState } from "react";
import brandIconUrl from "../../assets/favicon.svg";
import { database } from "../database/database";
import {
  type ApplicationsRepository,
  DexieApplicationsRepository,
} from "../database/repositories/applicationsRepository";
import { ApplicationBoard } from "../features/applications/components/ApplicationBoard";
import { ApplicationFormDialog } from "../features/applications/components/ApplicationFormDialog";
import { DeleteApplicationDialog } from "../features/applications/components/DeleteApplicationDialog";
import { useApplications } from "../features/applications/hooks/useApplications";
import type { Application } from "../features/applications/types/application";
import { Notifications } from "../shared/notifications";

const defaultRepository = new DexieApplicationsRepository(database);

type AppProps = {
  repository?: ApplicationsRepository;
};

export function App({ repository = defaultRepository }: AppProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [applicationToEdit, setApplicationToEdit] =
    useState<Application | null>(null);
  const [applicationToDelete, setApplicationToDelete] =
    useState<Application | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
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
  } = useApplications(repository);

  function closeForm() {
    setIsFormOpen(false);
    queueMicrotask(() => createButtonRef.current?.focus());
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

          <button
            ref={createButtonRef}
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-brand px-4 text-sm font-bold text-white shadow-card transition duration-200 ease-standard hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-card-hover motion-reduce:transform-none sm:px-5"
            onClick={() => setIsFormOpen(true)}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              +
            </span>
            Nova candidatura
          </button>
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

        <ApplicationBoard
          applications={applications}
          isLoading={status === "loading"}
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
