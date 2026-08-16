import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { notification } from "../../../shared/notifications";
import {
  type JobPortalInput,
  jobPortalSchema,
} from "../schemas/resourceSchemas";
import type { JobPortal } from "../types/resource";

type JobPortalFormDialogProps = {
  jobPortal?: JobPortal;
  onClose: () => void;
  onSubmit: (input: JobPortalInput) => Promise<unknown>;
};

const FIELD_CLASS_NAME =
  "mt-2 min-h-11 w-full rounded-button border border-line-strong bg-card px-3.5 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-subtle focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15 aria-invalid:border-danger";

export function JobPortalFormDialog({
  jobPortal,
  onClose,
  onSubmit,
}: JobPortalFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const isEditing = jobPortal !== undefined;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobPortalInput>({
    resolver: zodResolver(jobPortalSchema),
    defaultValues: jobPortal
      ? { name: jobPortal.name, url: jobPortal.url }
      : { name: "", url: "" },
  });

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  async function submit(input: JobPortalInput) {
    setSubmissionError(null);

    try {
      await onSubmit(input);
      notification.success(
        isEditing ? "Portal atualizado." : "Portal adicionado à lista.",
      );
      onClose();
    } catch {
      setSubmissionError(
        `Não foi possível ${isEditing ? "atualizar" : "adicionar"} o portal. Seus dados foram mantidos.`,
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
      aria-labelledby="job-portal-form-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="border-b border-line px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="mb-1.5 text-xs font-bold tracking-[0.16em] text-info uppercase">
              Portais de Vagas
            </p>
            <h2
              id="job-portal-form-title"
              className="font-display text-2xl font-bold"
            >
              {isEditing ? "Editar portal" : "Adicionar portal"}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-xl text-muted"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Fechar formulário de portal"
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
        <label className="block text-sm font-bold" htmlFor="job-portal-name">
          Nome do portal
        </label>
        <input
          id="job-portal-name"
          className={FIELD_CLASS_NAME}
          autoFocus
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name ? (
          <p className="mt-1.5 text-sm text-danger" role="alert">
            {errors.name.message}
          </p>
        ) : null}

        <label
          className="mt-5 block text-sm font-bold"
          htmlFor="job-portal-url"
        >
          Link do portal
        </label>
        <input
          id="job-portal-url"
          className={FIELD_CLASS_NAME}
          type="url"
          inputMode="url"
          placeholder="https://portal.example"
          aria-invalid={Boolean(errors.url)}
          {...register("url")}
        />
        {errors.url ? (
          <p className="mt-1.5 text-sm text-danger" role="alert">
            {errors.url.message}
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
            {isSubmitting ? "Salvando..." : "Salvar portal"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
