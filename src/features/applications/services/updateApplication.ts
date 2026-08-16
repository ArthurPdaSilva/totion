import type {
  ApplicationsRepository,
  ApplicationUpdate,
} from "../../../database/repositories/applicationsRepository";
import type { NewApplication } from "../schemas/applicationSchema";

type UpdateApplicationDependencies = {
  now: () => Date;
};

const DEFAULT_DEPENDENCIES: UpdateApplicationDependencies = {
  now: () => new Date(),
};

export function updateApplication(
  repository: ApplicationsRepository,
  id: string,
  input: NewApplication,
  dependencies = DEFAULT_DEPENDENCIES,
) {
  const update: ApplicationUpdate = {
    ...input,
    updatedAt: dependencies.now().toISOString(),
  };

  return repository.updateById(id, update);
}
