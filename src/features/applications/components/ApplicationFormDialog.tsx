import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { notification } from "../../../shared/notifications";
import { getCurrentCivilDate } from "../../../shared/utils/civilDate";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
} from "../constants/applicationStatuses";
import {
  type ApplicationFormValues,
  applicationSchema,
  type NewApplication,
} from "../schemas/applicationSchema";

type ApplicationFormDialogProps = {
  onClose: () => void;
  onCreate: (application: NewApplication) => Promise<unknown>;
};

const FIELD_CLASS_NAME =
  "mt-2 min-h-11 w-full rounded-button border border-line-strong bg-card px-3.5 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-subtle hover:border-muted focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15 aria-invalid:border-danger aria-invalid:ring-danger/10";

export function ApplicationFormDialog({
  onClose,
  onCreate,
}: ApplicationFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, NewApplication>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      status: "applied",
      appliedAt: getCurrentCivilDate(),
      jobUrl: "",
      notes: "",
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  async function submitApplication(application: NewApplication) {
    setSubmissionError(null);

    try {
      await onCreate(application);
      reset();
      onClose();
      notification.success("Candidatura adicionada ao quadro.");
    } catch {
      setSubmissionError(
        "Não foi possível salvar a candidatura. Seus dados foram mantidos para você tentar novamente.",
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
      className="m-auto w-[min(42rem,calc(100%-2rem))] rounded-dialog border border-line bg-panel p-0 text-ink shadow-dialog"
      aria-labelledby="application-form-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className="border-b border-line px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="mb-1.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Nova oportunidade
            </p>
            <h2
              id="application-form-title"
              className="font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl"
            >
              Adicionar candidatura
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
              Registre os dados principais agora. Você poderá acompanhar esta
              vaga pelo quadro.
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-xl leading-none text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Fechar formulário"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <form
        className="max-h-[min(68vh,42rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"
        onSubmit={handleSubmit(submitApplication)}
        noValidate
      >
        {submissionError ? (
          <div
            className="mb-5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {submissionError}
          </div>
        ) : null}

        <div>
          <label
            className="text-sm font-bold text-ink"
            htmlFor="application-name"
          >
            Nome da vaga
          </label>
          <input
            id="application-name"
            className={FIELD_CLASS_NAME}
            type="text"
            placeholder="Ex.: Desenvolvedor Front-end"
            autoFocus
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? "application-name-error" : undefined
            }
            required
            {...register("name")}
          />
          <FieldError
            id="application-name-error"
            message={errors.name?.message}
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              className="text-sm font-bold text-ink"
              htmlFor="application-status"
            >
              Status
            </label>
            <select
              id="application-status"
              className={FIELD_CLASS_NAME}
              aria-invalid={Boolean(errors.status)}
              aria-describedby={
                errors.status ? "application-status-error" : undefined
              }
              required
              {...register("status")}
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <FieldError
              id="application-status-error"
              message={errors.status?.message}
            />
          </div>

          <div>
            <label
              className="text-sm font-bold text-ink"
              htmlFor="application-date"
            >
              Aplicado em
            </label>
            <input
              id="application-date"
              className={FIELD_CLASS_NAME}
              type="date"
              aria-invalid={Boolean(errors.appliedAt)}
              aria-describedby={
                errors.appliedAt ? "application-date-error" : undefined
              }
              required
              {...register("appliedAt")}
            />
            <FieldError
              id="application-date-error"
              message={errors.appliedAt?.message}
            />
          </div>
        </div>

        <div className="mt-5">
          <label
            className="text-sm font-bold text-ink"
            htmlFor="application-url"
          >
            Link da vaga{" "}
            <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="application-url"
            className={FIELD_CLASS_NAME}
            type="url"
            inputMode="url"
            placeholder="https://empresa.com/vaga"
            aria-invalid={Boolean(errors.jobUrl)}
            aria-describedby={
              errors.jobUrl ? "application-url-error" : undefined
            }
            {...register("jobUrl")}
          />
          <FieldError
            id="application-url-error"
            message={errors.jobUrl?.message}
          />
        </div>

        <div className="mt-5">
          <label
            className="text-sm font-bold text-ink"
            htmlFor="application-notes"
          >
            Anotações <span className="font-normal text-muted">(opcional)</span>
          </label>
          <textarea
            id="application-notes"
            className={`${FIELD_CLASS_NAME} min-h-28 resize-y`}
            placeholder="Contatos, próximos passos ou detalhes importantes..."
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={
              errors.notes ? "application-notes-error" : undefined
            }
            {...register("notes")}
          />
          <FieldError
            id="application-notes-error"
            message={errors.notes?.message}
          />
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-11 rounded-button border border-line-strong bg-card px-5 text-sm font-bold text-ink transition hover:bg-canvas disabled:opacity-50"
            onClick={requestClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-button bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar candidatura"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

type FieldErrorProps = {
  id: string;
  message?: string;
};

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-1.5 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}
