import { APPLICATION_STATUSES } from "../constants/applicationStatuses";
import type { Application, ApplicationStatus } from "../types/application";

export type ApplicationDropTarget =
  | { type: "column"; status: ApplicationStatus }
  | { type: "application"; id: string; edge: "before" | "after" };

function applicationsInStatus(
  applications: Application[],
  status: ApplicationStatus,
) {
  return applications
    .filter((application) => application.status === status)
    .sort((first, second) => first.position - second.position);
}

function normalizeColumn(
  applications: Application[],
  status: ApplicationStatus,
) {
  return applications.map((application, position) =>
    application.status === status && application.position === position
      ? application
      : { ...application, status, position },
  );
}

export function reorderApplications(
  applications: Application[],
  activeId: string,
  target: ApplicationDropTarget,
) {
  const activeApplication = applications.find(
    (application) => application.id === activeId,
  );
  const overApplication =
    target.type === "application"
      ? applications.find((application) => application.id === target.id)
      : undefined;

  if (
    !activeApplication ||
    (target.type === "application" && !overApplication)
  ) {
    return applications;
  }

  if (overApplication?.id === activeId) {
    return applications;
  }

  const targetStatus =
    target.type === "column" ? target.status : overApplication?.status;

  if (!targetStatus) {
    return applications;
  }
  const sourceColumn = applicationsInStatus(
    applications,
    activeApplication.status,
  );
  const targetColumn =
    targetStatus === activeApplication.status
      ? sourceColumn
      : applicationsInStatus(applications, targetStatus);
  const sourceIndex = sourceColumn.findIndex(
    (application) => application.id === activeId,
  );
  const targetIndex =
    target.type === "column"
      ? targetColumn.length
      : targetColumn.findIndex((application) => application.id === target.id) +
        (target.edge === "after" ? 1 : 0);

  if (targetStatus === activeApplication.status) {
    const reorderedColumn = [...sourceColumn];
    const [movedApplication] = reorderedColumn.splice(sourceIndex, 1);

    if (!movedApplication) {
      return applications;
    }

    const adjustedTargetIndex =
      sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;

    if (sourceIndex === adjustedTargetIndex) {
      return applications;
    }

    reorderedColumn.splice(adjustedTargetIndex, 0, movedApplication);
    const normalizedColumn = normalizeColumn(reorderedColumn, targetStatus);

    return APPLICATION_STATUSES.flatMap((status) =>
      status === targetStatus
        ? normalizedColumn
        : applicationsInStatus(applications, status),
    );
  }

  const sourceWithoutActive = sourceColumn.filter(
    (application) => application.id !== activeId,
  );
  const destinationWithActive = [...targetColumn];
  destinationWithActive.splice(targetIndex, 0, activeApplication);
  const normalizedSource = normalizeColumn(
    sourceWithoutActive,
    activeApplication.status,
  );
  const normalizedTarget = normalizeColumn(destinationWithActive, targetStatus);

  return APPLICATION_STATUSES.flatMap((status) => {
    if (status === activeApplication.status) {
      return normalizedSource;
    }

    if (status === targetStatus) {
      return normalizedTarget;
    }

    return applicationsInStatus(applications, status);
  });
}
