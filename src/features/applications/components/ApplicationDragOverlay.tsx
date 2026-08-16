import { formatCivilDate } from "../../../shared/utils/civilDate";
import { APPLICATION_STATUS_LABELS } from "../constants/applicationStatuses";
import type { Application } from "../types/application";

export function ApplicationDragOverlay({
  application,
}: {
  application: Application;
}) {
  return (
    <article className="pointer-events-none w-board-column rotate-1 rounded-card border border-line-strong bg-card p-4 shadow-dialog">
      <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.12em] text-brand uppercase">
        {APPLICATION_STATUS_LABELS[application.status]}
      </p>
      <h3 className="break-words text-[0.9375rem] leading-6 font-semibold text-ink">
        {application.name}
      </h3>
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
        {formatCivilDate(application.appliedAt)}
      </p>
    </article>
  );
}
