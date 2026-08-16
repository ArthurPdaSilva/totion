import type Dexie from "dexie";

export function registerInitialSchema(database: Dexie) {
  database.version(1).stores({
    applications: "id, status, [status+position], createdAt",
  });
}
