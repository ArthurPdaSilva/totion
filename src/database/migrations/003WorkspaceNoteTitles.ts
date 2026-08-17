import type Dexie from "dexie";

export function registerWorkspaceNoteTitles(database: Dexie) {
  database
    .version(3)
    .stores({
      applications: "id, status, [status+position], createdAt",
      jobPortals: "id, createdAt",
      notes: "id, createdAt",
    })
    .upgrade(async (transaction) => {
      await transaction
        .table("notes")
        .toCollection()
        .modify((note) => {
          if (!("title" in note)) {
            note.title = null;
          }
        });
    });
}
