import { useRef, useState } from "react";
import type { JobPortalInput } from "../schemas/resourceSchemas";
import type { JobPortal } from "../types/resource";
import { DeleteResourceDialog } from "./DeleteResourceDialog";
import { JobPortalFormDialog } from "./JobPortalFormDialog";
import { StaticListColumn } from "./StaticListColumn";

type JobPortalsColumnProps = {
  jobPortals: JobPortal[];
  totalCount: number;
  isFiltered: boolean;
  onAdd: (input: JobPortalInput) => Promise<unknown>;
  onEdit: (id: string, input: JobPortalInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
};

export function JobPortalsColumn({
  jobPortals,
  totalCount,
  isFiltered,
  onAdd,
  onEdit,
  onDelete,
}: JobPortalsColumnProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [jobPortalToEdit, setJobPortalToEdit] = useState<JobPortal | null>(
    null,
  );
  const [jobPortalToDelete, setJobPortalToDelete] = useState<JobPortal | null>(
    null,
  );

  function closeForm() {
    const trigger = lastTriggerRef.current;
    setIsFormOpen(false);
    setJobPortalToEdit(null);
    queueMicrotask(() =>
      trigger?.isConnected ? trigger.focus() : addButtonRef.current?.focus(),
    );
  }

  function closeDeletion() {
    const trigger = lastTriggerRef.current;
    setJobPortalToDelete(null);
    queueMicrotask(() => trigger?.focus());
  }

  return (
    <>
      <StaticListColumn
        id="job-portals"
        title="Portais de Vagas"
        items={jobPortals}
        totalCount={totalCount}
        isFiltered={isFiltered}
        emptyMessage="Adicione os portais onde você costuma procurar vagas."
        markerClassName="bg-info"
        surfaceClassName="bg-info-soft/55"
        countClassName="bg-info-soft text-info"
        addLabel="Adicionar portal"
        addButtonRef={addButtonRef}
        onAdd={() => {
          lastTriggerRef.current = addButtonRef.current;
          setIsFormOpen(true);
        }}
        renderItem={(jobPortal) => (
          <article
            key={jobPortal.id}
            className="rounded-card border border-line bg-card p-4 shadow-card min-[1440px]:p-3 2xl:p-4"
          >
            <h3 className="break-words text-[0.9375rem] leading-6 font-semibold text-ink">
              {jobPortal.name}
            </h3>
            <a
              className="mt-3 inline-flex min-h-9 max-w-full items-center break-all rounded-button text-sm font-semibold text-info underline decoration-info/30 underline-offset-4"
              href={jobPortal.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir portal ${jobPortal.name} em uma nova aba`}
            >
              Acessar portal
            </a>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <button
                id={`edit-job-portal-${jobPortal.id}`}
                type="button"
                className="min-h-10 flex-1 rounded-button text-xs font-bold text-info hover:bg-info-soft"
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setJobPortalToEdit(jobPortal);
                  setIsFormOpen(true);
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-button text-xs font-bold text-danger hover:bg-danger-soft"
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setJobPortalToDelete(jobPortal);
                }}
              >
                Excluir
              </button>
            </div>
          </article>
        )}
      />

      {isFormOpen ? (
        <JobPortalFormDialog
          jobPortal={jobPortalToEdit ?? undefined}
          onClose={closeForm}
          onSubmit={(input) =>
            jobPortalToEdit ? onEdit(jobPortalToEdit.id, input) : onAdd(input)
          }
        />
      ) : null}

      {jobPortalToDelete ? (
        <DeleteResourceDialog
          itemType="portal"
          itemDescription={jobPortalToDelete.name}
          onCancel={closeDeletion}
          onDelete={() => onDelete(jobPortalToDelete.id)}
          onDeleted={() => {
            setJobPortalToDelete(null);
            queueMicrotask(() => addButtonRef.current?.focus());
          }}
        />
      ) : null}
    </>
  );
}
