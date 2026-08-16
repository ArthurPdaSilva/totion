import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { KeyboardEvent } from "react";
import { APPLICATION_STATUS_LABELS } from "../constants/applicationStatuses";
import type { Application, ApplicationStatus } from "../types/application";
import { SortableApplicationCard } from "./SortableApplicationCard";

type ApplicationColumnProps = {
  status: ApplicationStatus;
  applications: Application[];
  isDragDisabled: boolean;
  keyboardActiveId: string | null;
  onKeyboardDragKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    application: Application,
  ) => void;
  onRequestEdit: (application: Application, trigger: HTMLButtonElement) => void;
  onRequestDelete: (
    application: Application,
    trigger: HTMLButtonElement,
  ) => void;
};

const STATUS_STYLES = {
  applied: {
    surface: "bg-applied-soft/70",
    border: "border-applied-line",
    marker: "bg-applied",
    count: "bg-applied-soft text-applied",
  },
  in_progress: {
    surface: "bg-progress-soft/70",
    border: "border-progress-line",
    marker: "bg-progress",
    count: "bg-progress-soft text-progress",
  },
  closed: {
    surface: "bg-closed-soft/70",
    border: "border-closed-line",
    marker: "bg-closed",
    count: "bg-closed-soft text-closed",
  },
} satisfies Record<
  ApplicationStatus,
  { surface: string; border: string; marker: string; count: string }
>;

export function ApplicationColumn({
  status,
  applications,
  isDragDisabled,
  keyboardActiveId,
  onKeyboardDragKeyDown,
  onRequestEdit,
  onRequestDelete,
}: ApplicationColumnProps) {
  const label = APPLICATION_STATUS_LABELS[status];
  const styles = STATUS_STYLES[status];
  const headingId = `column-${status}`;
  const { isOver, setNodeRef } = useDroppable({
    id: `application-column:${status}`,
    disabled: applications.length > 0,
  });

  return (
    <section
      ref={setNodeRef}
      className={`w-board-column shrink-0 snap-start rounded-panel border ${styles.border} ${styles.surface} p-3 transition sm:p-4 ${isOver ? "ring-3 ring-focus/20" : ""}`}
      aria-labelledby={headingId}
    >
      <header className="mb-4 flex min-h-8 items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${styles.marker}`}
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="font-display text-lg font-bold tracking-[-0.015em] text-ink"
            tabIndex={-1}
          >
            {label}
          </h2>
        </div>
        <span
          className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-bold tabular-nums ${styles.count}`}
          role="status"
          aria-label={`${applications.length} ${applications.length === 1 ? "candidatura" : "candidaturas"}`}
        >
          {applications.length}
        </span>
      </header>

      <SortableContext
        items={applications.map((application) => application.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-32 space-y-3">
          {applications.length > 0 ? (
            applications.map((application) => (
              <SortableApplicationCard
                key={application.id}
                application={application}
                isDragDisabled={isDragDisabled}
                isKeyboardDragging={keyboardActiveId === application.id}
                onKeyboardDragKeyDown={onKeyboardDragKeyDown}
                onRequestEdit={onRequestEdit}
                onRequestDelete={onRequestDelete}
              />
            ))
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-card border border-dashed border-line-strong bg-card/45 px-6 text-center text-sm leading-6 text-muted">
              Nenhuma candidatura aqui ainda.
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
