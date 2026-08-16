import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type KeyboardEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import { APPLICATION_STATUS_LABELS } from "../constants/applicationStatuses";
import type { Application, ApplicationStatus } from "../types/application";
import { SortableApplicationCard } from "./SortableApplicationCard";

type ApplicationColumnProps = {
  status: ApplicationStatus;
  applications: Application[];
  totalCount: number;
  isFiltered: boolean;
  activeApplicationId: string | null;
  isDragActive: boolean;
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

const APPLICATIONS_BATCH_SIZE = 5;

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
  totalCount,
  isFiltered,
  activeApplicationId,
  isDragActive,
  isDragDisabled,
  keyboardActiveId,
  onKeyboardDragKeyDown,
  onRequestEdit,
  onRequestDelete,
}: ApplicationColumnProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(APPLICATIONS_BATCH_SIZE);
  const label = APPLICATION_STATUS_LABELS[status];
  const styles = STATUS_STYLES[status];
  const headingId = `column-${status}`;
  const activeApplicationIndex = activeApplicationId
    ? applications.findIndex(
        (application) => application.id === activeApplicationId,
      )
    : -1;
  const effectiveVisibleCount = Math.max(
    visibleCount,
    activeApplicationIndex + 1,
  );
  const visibleApplications = applications.slice(0, effectiveVisibleCount);
  const hasMoreApplications = visibleApplications.length < applications.length;
  const { isOver, setNodeRef } = useDroppable({
    id: `application-column:${status}`,
  });

  useEffect(() => {
    if (activeApplicationIndex >= visibleCount) {
      setVisibleCount(activeApplicationIndex + 1);
    }
  }, [activeApplicationIndex, visibleCount]);

  useEffect(() => {
    if (
      !hasMoreApplications ||
      isDragActive ||
      !loadMoreRef.current ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startTransition(() => {
            setVisibleCount((currentCount) =>
              Math.min(
                currentCount + APPLICATIONS_BATCH_SIZE,
                applications.length,
              ),
            );
          });
        }
      },
      { rootMargin: "0px 0px 240px" },
    );
    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [applications.length, hasMoreApplications, isDragActive]);

  function loadMoreApplications() {
    startTransition(() => {
      setVisibleCount((currentCount) =>
        Math.min(currentCount + APPLICATIONS_BATCH_SIZE, applications.length),
      );
    });
  }

  return (
    <section
      ref={setNodeRef}
      className={`w-board-column shrink-0 snap-start rounded-panel border ${styles.border} ${styles.surface} p-3 transition sm:p-4 xl:w-auto xl:min-w-0 xl:flex-1 xl:shrink xl:snap-none xl:p-3 2xl:p-4 ${isOver ? "ring-3 ring-focus/20" : ""}`}
      aria-labelledby={headingId}
    >
      <header className="mb-4 flex min-h-8 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${styles.marker}`}
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="truncate font-display text-lg font-bold tracking-[-0.015em] text-ink"
            tabIndex={-1}
          >
            {label}
          </h2>
        </div>
        <span
          className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-bold tabular-nums ${styles.count}`}
          role="status"
          aria-label={
            isFiltered
              ? `${applications.length} de ${totalCount} candidaturas encontradas`
              : `${totalCount} ${totalCount === 1 ? "candidatura" : "candidaturas"}`
          }
        >
          {isFiltered ? `${applications.length}/${totalCount}` : totalCount}
        </span>
      </header>

      <SortableContext
        items={visibleApplications.map((application) => application.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-32 space-y-3">
          {applications.length > 0 ? (
            visibleApplications.map((application) => (
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
              {isFiltered
                ? "Nenhuma candidatura encontrada."
                : "Nenhuma candidatura aqui ainda."}
            </div>
          )}
        </div>
      </SortableContext>

      {hasMoreApplications ? (
        <div
          ref={loadMoreRef}
          className="mt-4 rounded-card border border-dashed border-line-strong bg-card/45 px-3 py-3 text-center"
        >
          <p className="text-xs text-muted tabular-nums">
            Mostrando {visibleApplications.length} de {applications.length}
          </p>
          <button
            type="button"
            className="mt-2 min-h-10 rounded-button px-3 text-sm font-bold text-ink transition hover:bg-card disabled:opacity-50"
            onClick={loadMoreApplications}
            disabled={isDragActive}
          >
            Carregar mais
          </button>
        </div>
      ) : null}
    </section>
  );
}
