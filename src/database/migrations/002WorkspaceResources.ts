import type Dexie from "dexie";

export function registerWorkspaceResources(database: Dexie) {
  database.version(2).stores({
    applications: "id, status, [status+position], createdAt",
    jobPortals: "id, createdAt",
    notes: "id, createdAt",
  });
}
