import { APPLICATION_STATUSES } from "../../features/applications/constants/applicationStatuses";
import { getApplicationIdentity } from "../../features/applications/services/applicationIdentity";
import type {
  Application,
  ApplicationStatus,
} from "../../features/applications/types/application";
import type { TotionDatabase } from "../database";

export type ApplicationWithoutPosition = Omit<Application, "position">;
export type ApplicationUpdate = Pick<
  Application,
  "name" | "status" | "appliedAt" | "jobUrl" | "notes" | "updatedAt"
>;

export interface ApplicationsRepository {
  list(): Promise<Application[]>;
  create(application: ApplicationWithoutPosition): Promise<Application>;
  createMany(
    applications: ApplicationWithoutPosition[],
  ): Promise<Application[]>;
  updateById(id: string, update: ApplicationUpdate): Promise<Application[]>;
  moveById(
    id: string,
    targetStatus: ApplicationStatus,
    targetPosition: number,
    updatedAt: string,
  ): Promise<Application[]>;
  deleteById(id: string, reorderedAt: string): Promise<Application[]>;
}

function normalizePositions(applications: Application[], updatedAt: string) {
  return applications.flatMap((application, position) =>
    application.position === position
      ? []
      : [{ ...application, position, updatedAt }],
  );
}

function insertApplication(
  applications: Application[],
  application: Application,
  status: ApplicationStatus,
  requestedPosition: number,
  updatedAt: string,
) {
  const position = Math.max(
    0,
    Math.min(requestedPosition, applications.length),
  );
  const applicationsWithMoved = [...applications];
  applicationsWithMoved.splice(position, 0, {
    ...application,
    status,
    position,
    updatedAt,
  });

  return applicationsWithMoved.flatMap((currentApplication, currentPosition) =>
    currentApplication.id === application.id ||
    currentApplication.position !== currentPosition
      ? [
          {
            ...currentApplication,
            position: currentPosition,
            updatedAt,
          },
        ]
      : [],
  );
}

export class DexieApplicationsRepository implements ApplicationsRepository {
  constructor(private readonly database: TotionDatabase) {}

  async list() {
    const applicationsByStatus = await Promise.all(
      APPLICATION_STATUSES.map((status) =>
        this.database.applications
          .where("status")
          .equals(status)
          .sortBy("position"),
      ),
    );

    return applicationsByStatus.flat();
  }

  async create(application: ApplicationWithoutPosition) {
    return this.database.transaction(
      "rw",
      this.database.applications,
      async () => {
        const applicationsInStatus = await this.database.applications
          .where("status")
          .equals(application.status)
          .toArray();
        const lastPosition = applicationsInStatus.reduce(
          (highestPosition, currentApplication) =>
            Math.max(highestPosition, currentApplication.position),
          -1,
        );
        const persistedApplication: Application = {
          ...application,
          position: lastPosition + 1,
        };

        await this.database.applications.add(persistedApplication);

        return persistedApplication;
      },
    );
  }

  async createMany(applications: ApplicationWithoutPosition[]) {
    return this.database.transaction(
      "rw",
      this.database.applications,
      async () => {
        const existingApplications = await this.database.applications.toArray();
        const identities = new Set(
          existingApplications.map(getApplicationIdentity),
        );
        const nextPositions = new Map<ApplicationStatus, number>(
          APPLICATION_STATUSES.map((status) => [
            status,
            existingApplications.reduce(
              (nextPosition, application) =>
                application.status === status
                  ? Math.max(nextPosition, application.position + 1)
                  : nextPosition,
              0,
            ),
          ]),
        );
        const importedApplications: Application[] = [];

        for (const application of applications) {
          const identity = getApplicationIdentity(application);

          if (identities.has(identity)) {
            continue;
          }

          const position = nextPositions.get(application.status) ?? 0;
          importedApplications.push({ ...application, position });
          nextPositions.set(application.status, position + 1);
          identities.add(identity);
        }

        if (importedApplications.length > 0) {
          await this.database.applications.bulkAdd(importedApplications);
        }

        return importedApplications;
      },
    );
  }

  async updateById(id: string, update: ApplicationUpdate) {
    return this.database.transaction(
      "rw",
      this.database.applications,
      async () => {
        const currentApplication = await this.database.applications.get(id);

        if (!currentApplication) {
          throw new Error("Candidatura não encontrada");
        }

        if (currentApplication.status === update.status) {
          const updatedApplication = {
            ...currentApplication,
            ...update,
          };
          await this.database.applications.put(updatedApplication);
          return [updatedApplication];
        }

        const sourceApplications = (
          await this.database.applications
            .where("status")
            .equals(currentApplication.status)
            .sortBy("position")
        ).filter((application) => application.id !== id);
        const targetApplications = await this.database.applications
          .where("status")
          .equals(update.status)
          .sortBy("position");
        const normalizedSource = normalizePositions(
          sourceApplications,
          update.updatedAt,
        );
        const normalizedTarget = normalizePositions(
          targetApplications,
          update.updatedAt,
        );
        const updatedApplication: Application = {
          ...currentApplication,
          ...update,
          position: targetApplications.length,
        };
        const changedApplications = [
          ...normalizedSource,
          ...normalizedTarget,
          updatedApplication,
        ];

        await this.database.applications.bulkPut(changedApplications);
        return changedApplications;
      },
    );
  }

  async moveById(
    id: string,
    targetStatus: ApplicationStatus,
    targetPosition: number,
    updatedAt: string,
  ) {
    return this.database.transaction(
      "rw",
      this.database.applications,
      async () => {
        const currentApplication = await this.database.applications.get(id);

        if (!currentApplication) {
          throw new Error("Candidatura não encontrada");
        }

        const sourceApplications = (
          await this.database.applications
            .where("status")
            .equals(currentApplication.status)
            .sortBy("position")
        ).filter((application) => application.id !== id);

        if (currentApplication.status === targetStatus) {
          const changedApplications = insertApplication(
            sourceApplications,
            currentApplication,
            targetStatus,
            targetPosition,
            updatedAt,
          );
          await this.database.applications.bulkPut(changedApplications);
          return changedApplications;
        }

        const targetApplications = await this.database.applications
          .where("status")
          .equals(targetStatus)
          .sortBy("position");
        const normalizedSource = normalizePositions(
          sourceApplications,
          updatedAt,
        );
        const changedTarget = insertApplication(
          targetApplications,
          currentApplication,
          targetStatus,
          targetPosition,
          updatedAt,
        );
        const changedApplications = [...normalizedSource, ...changedTarget];

        await this.database.applications.bulkPut(changedApplications);
        return changedApplications;
      },
    );
  }

  async deleteById(id: string, reorderedAt: string) {
    return this.database.transaction(
      "rw",
      this.database.applications,
      async () => {
        const application = await this.database.applications.get(id);

        if (!application) {
          return [];
        }

        await this.database.applications.delete(id);

        const remainingApplications = await this.database.applications
          .where("status")
          .equals(application.status)
          .sortBy("position");
        const applicationsToReorder = normalizePositions(
          remainingApplications,
          reorderedAt,
        );

        if (applicationsToReorder.length > 0) {
          await this.database.applications.bulkPut(applicationsToReorder);
        }

        return applicationsToReorder;
      },
    );
  }
}
