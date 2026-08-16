import type { APPLICATION_STATUSES } from "../constants/applicationStatuses";

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type Application = {
  id: string;
  name: string;
  status: ApplicationStatus;
  appliedAt: string;
  jobUrl: string | null;
  notes: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};
