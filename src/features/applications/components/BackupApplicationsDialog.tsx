import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { notification } from "../../../shared/notifications";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
} from "../constants/applicationStatuses";
import {
  type ApplicationBackup,
  createApplicationBackup,
  parseApplicationBackup,
} from "../services/applicationBackup";
import type { Application } from "../types/application";

type BackupApplicationsDialogProps = {
  applications: Application[];
  onClose: () => void;
  onRestore: (applications: Application[]) => Promise<void>;
};

export function BackupApplicationsDialog({
  applications,
  onClose,
  onRestore,
}: BackupApplicationsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fileName, setFileName] = useState("");
  const [backup, setBackup] = useState<ApplicationBackup | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [hasConfirmedReplacement, setHasConfirmedReplacement] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function requestClose() {
    if (!isRestoring) {
      onClose();
    }
  }

  function exportBackup() {
    const { content, fileName: backupFileName } =
      createApplicationBackup(applications);
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName;
    link.click();
    URL.revokeObjectURL(url);

    notification.success(
      applications.length === 1
        ? "Backup de 1 candidatura exportado."
        : `Backup de ${applications.length} candidaturas exportado.`,
    );
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setBackup(null);
    setFileError(null);
    setRestoreError(null);
    setHasConfirmedReplacement(false);

    try {
      const result = parseApplicationBackup(await file.text());

      if (result.success) {
        setBackup(result.backup);
      } else {
        setFileError(result.error);
      }
    } catch {
      setFileError("Não foi possível ler o arquivo selecionado.");
    }
  }

  async function restoreBackup() {
    if (!backup || !hasConfirmedReplacement) {
      return;
    }

    setRestoreError(null);
    setIsRestoring(true);

    try {
      await onRestore(backup.applications);
      notification.success(
        backup.applications.length === 1
          ? "Backup restaurado com 1 candidatura."
          : `Backup restaurado com ${backup.applications.length} candidaturas.`,
      );
      onClose();
    } catch {
      setRestoreError(
        "Não foi possível restaurar o backup. O quadro anterior foi mantido.",
      );
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(42rem,calc(100%-1.5rem))] rounded-dialog border border-line bg-panel p-0 text-ink shadow-dialog"
      aria-labelledby="backup-applications-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="border-b border-line px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="mb-1.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Dados locais
            </p>
            <h2
              id="backup-applications-title"
              className="font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl"
            >
              Backup do quadro
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Guarde uma cópia completa das candidaturas ou restaure um arquivo
              exportado anteriormente pelo Totion.
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-xl leading-none text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
            onClick={requestClose}
            disabled={isRestoring}
            aria-label="Fechar backup"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <div className="max-h-[min(72vh,44rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        <section
          className="rounded-card border border-line bg-card p-5"
          aria-labelledby="export-backup-title"
        >
          <h3
            id="export-backup-title"
            className="font-display text-lg font-bold"
          >
            Exportar
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            O arquivo preserva os dados e a ordem dos cards nas três colunas.
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-button bg-brand px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover"
            onClick={exportBackup}
            disabled={isRestoring}
          >
            Exportar {applications.length}{" "}
            {applications.length === 1 ? "candidatura" : "candidaturas"}
          </button>
        </section>

        <section
          className="rounded-card border border-line bg-card p-5"
          aria-labelledby="restore-backup-title"
        >
          <h3
            id="restore-backup-title"
            className="font-display text-lg font-bold"
          >
            Restaurar
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Selecione um arquivo <code>.totion</code> para conferir seu conteúdo
            antes de substituir o quadro atual.
          </p>
          <label className="mt-4 block text-sm font-bold" htmlFor="backup-file">
            Arquivo Totion
          </label>
          <input
            id="backup-file"
            className="mt-2 block w-full text-sm text-muted file:mr-4 file:min-h-10 file:rounded-button file:border-0 file:bg-canvas-deep file:px-4 file:font-bold file:text-ink"
            type="file"
            accept=".totion,application/json"
            onChange={selectFile}
            disabled={isRestoring}
          />
          {fileName ? (
            <p className="mt-2 text-xs text-muted">Arquivo: {fileName}</p>
          ) : null}

          {fileError ? (
            <p
              className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {fileError}
            </p>
          ) : null}

          {backup ? (
            <div className="mt-5">
              <h4 className="text-sm font-bold">Conteúdo do backup</h4>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {APPLICATION_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="rounded-card border border-line bg-panel px-3 py-3"
                  >
                    <dt className="text-xs font-bold text-muted">
                      {APPLICATION_STATUS_LABELS[status]}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold tabular-nums">
                      {
                        backup.applications.filter(
                          (application) => application.status === status,
                        ).length
                      }
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-sm leading-6 text-danger">
                A restauração substituirá as {applications.length} candidaturas
                atuais. Exporte um backup antes de continuar se quiser preservar
                este quadro.
              </p>
              <label className="mt-4 flex min-h-11 items-start gap-3 text-sm leading-6 font-bold">
                <input
                  className="mt-1 h-5 w-5 shrink-0 accent-brand"
                  type="checkbox"
                  checked={hasConfirmedReplacement}
                  onChange={(event) =>
                    setHasConfirmedReplacement(event.target.checked)
                  }
                  disabled={isRestoring}
                />
                Entendo que o quadro atual será substituído por este backup.
              </label>
            </div>
          ) : null}

          {restoreError ? (
            <p
              className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {restoreError}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-4 min-h-11 rounded-button border border-danger/40 bg-danger-soft px-4 text-sm font-bold text-danger disabled:opacity-50"
            onClick={restoreBackup}
            disabled={!backup || !hasConfirmedReplacement || isRestoring}
          >
            {isRestoring
              ? "Restaurando..."
              : `Restaurar ${backup?.applications.length ?? 0} ${backup?.applications.length === 1 ? "candidatura" : "candidaturas"}`}
          </button>
        </section>
      </div>
    </dialog>
  );
}
