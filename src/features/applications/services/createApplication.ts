import type {
  ApplicationsRepository,
  ApplicationWithoutPosition,
} from "../../../database/repositories/applicationsRepository";
import type { NewApplication } from "../schemas/applicationSchema";

type CreateApplicationDependencies = {
  createId: () => string;
  now: () => Date;
};

const DEFAULT_DEPENDENCIES: CreateApplicationDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export async function createApplication(
  repository: ApplicationsRepository,
  input: NewApplication,
  dependencies = DEFAULT_DEPENDENCIES,
) {
  const timestamp = dependencies.now().toISOString();
  const application: ApplicationWithoutPosition = {
    ...input,
    id: dependencies.createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return repository.create(application);
}
