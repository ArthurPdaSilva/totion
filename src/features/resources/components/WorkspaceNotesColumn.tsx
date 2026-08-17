import { useRef, useState } from "react";
import type { WorkspaceNoteInput } from "../schemas/resourceSchemas";
import type { WorkspaceNote } from "../types/resource";
import { DeleteResourceDialog } from "./DeleteResourceDialog";
import { StaticListColumn } from "./StaticListColumn";
import { WorkspaceNoteFormDialog } from "./WorkspaceNoteFormDialog";

type WorkspaceNotesColumnProps = {
  notes: WorkspaceNote[];
  totalCount: number;
  isFiltered: boolean;
  onAdd: (input: WorkspaceNoteInput) => Promise<unknown>;
  onEdit: (id: string, input: WorkspaceNoteInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
};

export function WorkspaceNotesColumn({
  notes,
  totalCount,
  isFiltered,
  onAdd,
  onEdit,
  onDelete,
}: WorkspaceNotesColumnProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<WorkspaceNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<WorkspaceNote | null>(null);

  function closeForm() {
    const trigger = lastTriggerRef.current;
    setIsFormOpen(false);
    setNoteToEdit(null);
    queueMicrotask(() =>
      trigger?.isConnected ? trigger.focus() : addButtonRef.current?.focus(),
    );
  }

  function closeDeletion() {
    const trigger = lastTriggerRef.current;
    setNoteToDelete(null);
    queueMicrotask(() => trigger?.focus());
  }

  return (
    <>
      <StaticListColumn
        id="workspace-notes"
        title="Anotações"
        items={notes}
        totalCount={totalCount}
        isFiltered={isFiltered}
        emptyMessage="Guarde aqui lembretes e informações livres."
        markerClassName="bg-success"
        surfaceClassName="bg-success-soft/55"
        countClassName="bg-success-soft text-success"
        addLabel="Nova anotação"
        addButtonRef={addButtonRef}
        onAdd={() => {
          lastTriggerRef.current = addButtonRef.current;
          setIsFormOpen(true);
        }}
        renderItem={(note) => (
          <article
            key={note.id}
            className="rounded-card border border-line bg-card p-4 shadow-card min-[1440px]:p-3 2xl:p-4"
          >
            {note.title ? (
              <h3 className="line-clamp-2 break-words text-[0.9375rem] leading-6 font-semibold text-ink">
                {note.title}
              </h3>
            ) : null}
            <p
              className={`${note.title ? "mt-2" : ""} line-clamp-8 whitespace-pre-wrap break-words text-sm leading-6 text-ink`}
              title={note.content}
            >
              {note.content}
            </p>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <button
                id={`edit-workspace-note-${note.id}`}
                type="button"
                className="min-h-10 flex-1 rounded-button text-xs font-bold text-success hover:bg-success-soft"
                aria-label={`Editar anotação: ${note.title ?? note.content}`}
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setNoteToEdit(note);
                  setIsFormOpen(true);
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-button text-xs font-bold text-danger hover:bg-danger-soft"
                aria-label={`Excluir anotação: ${note.title ?? note.content}`}
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setNoteToDelete(note);
                }}
              >
                Excluir
              </button>
            </div>
          </article>
        )}
      />

      {isFormOpen ? (
        <WorkspaceNoteFormDialog
          note={noteToEdit ?? undefined}
          onClose={closeForm}
          onSubmit={(input) =>
            noteToEdit ? onEdit(noteToEdit.id, input) : onAdd(input)
          }
        />
      ) : null}

      {noteToDelete ? (
        <DeleteResourceDialog
          itemType="anotação"
          itemDescription={noteToDelete.title ?? noteToDelete.content}
          onCancel={closeDeletion}
          onDelete={() => onDelete(noteToDelete.id)}
          onDeleted={() => {
            setNoteToDelete(null);
            queueMicrotask(() => addButtonRef.current?.focus());
          }}
        />
      ) : null}
    </>
  );
}
