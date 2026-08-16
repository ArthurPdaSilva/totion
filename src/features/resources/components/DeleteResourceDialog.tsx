import { useEffect, useRef, useState } from "react";
import { notification } from "../../../shared/notifications";

type DeleteResourceDialogProps = {
  itemType: "portal" | "anotação";
  itemDescription: string;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
};

export function DeleteResourceDialog({
  itemType,
  itemDescription,
  onCancel,
  onDelete,
  onDeleted,
}: DeleteResourceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
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

    try {
      await onDelete();
      notification.success(
        itemType === "portal" ? "Portal excluído." : "Anotação excluída.",
      );
      onDeleted();
    } catch {
      setDeletionError(
        `Não foi possível excluir ${itemType === "portal" ? "o portal" : "a anotação"}. O item foi mantido.`,
      );
      setIsDeleting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-dialog border border-line bg-panel p-0 text-ink shadow-dialog"
      aria-labelledby="delete-resource-title"
      onCancel={(event) => {
        event.preventDefault();
        requestCancel();
      }}
    >
      <div className="px-5 pt-6 pb-5 sm:px-7">
        <h2
          id="delete-resource-title"
          className="font-display text-2xl font-bold"
        >
          Excluir {itemType}?
        </h2>
        <p className="mt-3 break-words text-sm leading-6 text-muted">
          <strong className="line-clamp-4 whitespace-pre-wrap text-ink">
            {itemDescription}
          </strong>{" "}
          {itemType === "portal" ? "será removido" : "será removida"}{" "}
          definitivamente.
        </p>
        {deletionError ? (
          <p
            className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {deletionError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          className="min-h-11 rounded-button border border-line-strong bg-card px-5 text-sm font-bold"
          onClick={requestCancel}
          disabled={isDeleting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="min-h-11 rounded-button bg-danger px-5 text-sm font-bold text-white disabled:opacity-60"
          onClick={confirmDeletion}
          disabled={isDeleting}
        >
          {isDeleting ? "Excluindo..." : `Excluir ${itemType}`}
        </button>
      </div>
    </dialog>
  );
}
