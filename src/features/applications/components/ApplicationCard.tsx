import type { ReactNode } from "react";
import { formatCivilDate } from "../../../shared/utils/civilDate";
import type { Application } from "../types/application";

type ApplicationCardProps = {
  application: Application;
  dragHandle: ReactNode;
  onRequestEdit: (application: Application, trigger: HTMLButtonElement) => void;
  onRequestDelete: (
    application: Application,
    trigger: HTMLButtonElement,
  ) => void;
};

export function ApplicationCard({
  application,
  dragHandle,
  onRequestEdit,
  onRequestDelete,
}: ApplicationCardProps) {
  return (
    <article className="group rounded-card border border-line bg-card p-4 shadow-card transition duration-200 ease-standard hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words pt-1 text-[0.9375rem] leading-6 font-semibold text-ink">
          {application.name}
        </h3>
        <div className="flex shrink-0 items-center">
          {dragHandle}
          <button
            id={`edit-application-${application.id}`}
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-button text-muted opacity-70 transition hover:bg-info-soft hover:text-info hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Editar candidatura ${application.name}`}
            title="Editar candidatura"
            onClick={(event) => onRequestEdit(application, event.currentTarget)}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-button text-muted opacity-70 transition hover:bg-danger-soft hover:text-danger hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Excluir candidatura ${application.name}`}
            title="Excluir candidatura"
            onClick={(event) =>
              onRequestDelete(application, event.currentTarget)
            }
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <dl className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Data da aplicação</dt>
          <dd>
            <time dateTime={application.appliedAt}>
              {formatCivilDate(application.appliedAt)}
            </time>
          </dd>
        </div>

        {application.notes ? (
          <div
            className="flex items-center gap-1.5"
            title="Esta candidatura possui anotações"
          >
            <dt className="sr-only">Situação das anotações</dt>
            <dd className="flex items-center gap-1">
              <NoteIcon />
              <span>Com anotações</span>
            </dd>
          </div>
        ) : null}
      </dl>

      {application.jobUrl ? (
        <a
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-button font-semibold text-sm text-brand underline decoration-brand/30 underline-offset-4 transition hover:text-brand-hover hover:decoration-brand-hover"
          href={application.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir vaga ${application.name} em uma nova aba`}
        >
          Abrir vaga
          <ExternalLinkIcon />
        </a>
      ) : null}
    </article>
  );
}

function NoteIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6 3.75h8.25L18 7.5v12.75H6V3.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 4v4h4M9 12h6M9 15.5h4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M14 5h5v5M19 5l-8 8M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4.5 7h15M9 7V4.5h6V7m2.5 0-.7 12.5H7.2L6.5 7M10 10.5v5.5M14 10.5v5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m14.5 5.5 4 4M5 19l3.8-.8L19 8a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L5.8 15.2 5 19Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
