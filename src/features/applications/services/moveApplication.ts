import type { ApplicationsRepository } from "../../../database/repositories/applicationsRepository";
import type { ApplicationStatus } from "../types/application";

type MoveApplicationDependencies = {
  now: () => Date;
};

const DEFAULT_DEPENDENCIES: MoveApplicationDependencies = {
  now: () => new Date(),
};

export function moveApplication(
  repository: ApplicationsRepository,
  id: string,
  targetStatus: ApplicationStatus,
  targetPosition: number,
  dependencies = DEFAULT_DEPENDENCIES,
) {
  return repository.moveById(
    id,
    targetStatus,
    targetPosition,
    dependencies.now().toISOString(),
  );
}
