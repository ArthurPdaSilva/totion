import { APPLICATION_STATUSES } from "../constants/applicationStatuses";
import type { Application } from "../types/application";
import { ApplicationColumn } from "./ApplicationColumn";

type ApplicationBoardProps = {
  applications: Application[];
  isLoading: boolean;
};

export function ApplicationBoard({
  applications,
  isLoading,
}: ApplicationBoardProps) {
  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-5 sm:gap-5"
      aria-busy={isLoading}
    >
      {APPLICATION_STATUSES.map((status) => {
        const applicationsInStatus = applications
          .filter((application) => application.status === status)
          .sort((first, second) => first.position - second.position);

        return (
          <ApplicationColumn
            key={status}
            status={status}
            applications={applicationsInStatus}
          />
        );
      })}
    </div>
  );
}
