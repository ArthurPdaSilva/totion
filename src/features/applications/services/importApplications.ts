import type {
  ApplicationsRepository,
  ApplicationWithoutPosition,
} from "../../../database/repositories/applicationsRepository";
import type { NewApplication } from "../schemas/applicationSchema";

export async function importApplications(
  repository: ApplicationsRepository,
  applications: NewApplication[],
) {
  const importedAt = new Date().toISOString();
  const records: ApplicationWithoutPosition[] = applications.map(
    (application) => ({
      id: crypto.randomUUID(),
      ...application,
      createdAt: importedAt,
      updatedAt: importedAt,
    }),
  );

  return repository.createMany(records);
}
