import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { notification } from "../../../shared/notifications";
import {
  type WorkspaceNoteFormValues,
  type WorkspaceNoteInput,
  workspaceNoteSchema,
} from "../schemas/resourceSchemas";
import type { WorkspaceNote } from "../types/resource";

type WorkspaceNoteFormDialogProps = {
  note?: WorkspaceNote;
  onClose: () => void;
  onSubmit: (input: WorkspaceNoteInput) => Promise<unknown>;
};

export function WorkspaceNoteFormDialog({
  note,
  onClose,
  onSubmit,
}: WorkspaceNoteFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const isEditing = note !== undefined;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceNoteFormValues, unknown, WorkspaceNoteInput>({
    resolver: zodResolver(workspaceNoteSchema),
    defaultValues: {
      title: note?.title ?? "",
      content: note?.content ?? "",
    },
  });

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  async function submit(input: WorkspaceNoteInput) {
    setSubmissionError(null);

    try {
      await onSubmit(input);
      notification.success(
        isEditing ? "Anotação atualizada." : "Anotação adicionada à lista.",
      );
      onClose();
    } catch {
      setSubmissionError(
        `Não foi possível ${isEditing ? "atualizar" : "adicionar"} a anotação. Seu texto foi mantido.`,
      );
    }
  }

  function requestClose() {
    if (!isSubmitting) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(36rem,calc(100%-2rem))] rounded-dialog border border-line bg-panel p-0 text-ink shadow-dialog"
      aria-labelledby="workspace-note-form-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="border-b border-line px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="mb-1.5 text-xs font-bold tracking-[0.16em] text-success uppercase">
              Anotações
            </p>
            <h2
              id="workspace-note-form-title"
              className="font-display text-2xl font-bold"
            >
              {isEditing ? "Editar anotação" : "Nova anotação"}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-xl text-muted"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Fechar formulário de anotação"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <form
        className="px-5 py-5 sm:px-7 sm:py-6"
        onSubmit={handleSubmit(submit)}
      >
        {submissionError ? (
          <p
            className="mb-5 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {submissionError}
          </p>
        ) : null}
        <label
          className="block text-sm font-bold"
          htmlFor="workspace-note-title"
        >
          Título <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id="workspace-note-title"
          className="mt-2 min-h-11 w-full rounded-button border border-line-strong bg-card px-3.5 py-2.5 text-sm text-ink focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15"
          autoFocus
          placeholder="Ex.: Mensagem de confirmação"
          {...register("title")}
        />

        <label
          className="mt-5 block text-sm font-bold"
          htmlFor="workspace-note-content"
        >
          Conteúdo
        </label>
        <textarea
          id="workspace-note-content"
          className="mt-2 min-h-44 w-full resize-y rounded-button border border-line-strong bg-card px-3.5 py-3 text-sm leading-6 text-ink focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15 aria-invalid:border-danger"
          placeholder="Escreva o que você quiser guardar..."
          aria-invalid={Boolean(errors.content)}
          {...register("content")}
        />
        {errors.content ? (
          <p className="mt-1.5 text-sm text-danger" role="alert">
            {errors.content.message}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-11 rounded-button border border-line-strong bg-card px-5 text-sm font-bold"
            onClick={requestClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-button bg-brand px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar anotação"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
