import type { ApplicationsRepository } from "../../../database/repositories/applicationsRepository";

type DeleteApplicationDependencies = {
  now: () => Date;
};

const DEFAULT_DEPENDENCIES: DeleteApplicationDependencies = {
  now: () => new Date(),
};

export function deleteApplication(
  repository: ApplicationsRepository,
  id: string,
  dependencies = DEFAULT_DEPENDENCIES,
) {
  return repository.deleteById(id, dependencies.now().toISOString());
}
