import { APPLICATION_STATUSES } from "../../features/applications/constants/applicationStatuses";
import type { Application } from "../../features/applications/types/application";
import type { TotionDatabase } from "../database";

export type ApplicationWithoutPosition = Omit<Application, "position">;

export interface ApplicationsRepository {
  list(): Promise<Application[]>;
  create(application: ApplicationWithoutPosition): Promise<Application>;
  deleteById(id: string, reorderedAt: string): Promise<Application[]>;
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
        const applicationsToReorder = remainingApplications.flatMap(
          (remainingApplication, position) =>
            remainingApplication.position === position
              ? []
              : [
                  {
                    ...remainingApplication,
                    position,
                    updatedAt: reorderedAt,
                  },
                ],
        );

        if (applicationsToReorder.length > 0) {
          await this.database.applications.bulkPut(applicationsToReorder);
        }

        return applicationsToReorder;
      },
    );
  }
}
