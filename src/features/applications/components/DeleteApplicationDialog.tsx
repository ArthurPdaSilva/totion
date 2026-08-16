import { useEffect, useRef, useState } from "react";
import type { Application } from "../types/application";

type DeleteApplicationDialogProps = {
  application: Application;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
};

export function DeleteApplicationDialog({
  application,
  onCancel,
  onDelete,
  onDeleted,
}: DeleteApplicationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function requestCancel() {
    if (!isDeleting) {
      onCancel();
    }
  }

  async function confirmDeletion() {
    setDeletionError(null);
    setIsDeleting(true);
    dialogRef.current?.focus();

    try {
      await onDelete();
      onDeleted();
    } catch {
      setDeletionError(
        "Não foi possível excluir a candidatura. Ela continua no seu quadro.",
      );
      setIsDeleting(false);
      setTimeout(() => cancelButtonRef.current?.focus(), 0);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-dialog border border-line bg-panel p-0 text-ink shadow-dialog"
      aria-labelledby="delete-application-title"
      aria-describedby="delete-application-description"
      aria-busy={isDeleting}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        requestCancel();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          requestCancel();
        }
      }}
    >
      <div className="px-5 pt-6 pb-5 sm:px-7 sm:pt-7">
        <span
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger"
          aria-hidden="true"
        >
          <WarningIcon />
        </span>
        <h2
          id="delete-application-title"
          className="font-display text-2xl font-bold tracking-[-0.025em]"
        >
          Excluir candidatura?
        </h2>
        <p
          id="delete-application-description"
          className="mt-3 text-sm leading-6 text-muted"
        >
          <strong className="font-bold text-ink">{application.name}</strong>{" "}
          será removida definitivamente. Esta ação não pode ser desfeita.
        </p>

        {deletionError ? (
          <p
            className="mt-5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {deletionError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line bg-canvas/55 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          ref={cancelButtonRef}
          type="button"
          className="min-h-11 rounded-button border border-line-strong bg-card px-5 text-sm font-bold text-ink transition hover:bg-canvas disabled:opacity-50"
          onClick={requestCancel}
          disabled={isDeleting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="min-h-11 rounded-button bg-danger px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-60"
          onClick={confirmDeletion}
          disabled={isDeleting}
        >
          {isDeleting ? "Excluindo..." : "Excluir candidatura"}
        </button>
      </div>
    </dialog>
  );
}

function WarningIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 8v5M12 16.5v.1M10.3 4.8 3.5 17a2 2 0 0 0 1.75 3h13.5a2 2 0 0 0 1.75-3L13.7 4.8a1.95 1.95 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
