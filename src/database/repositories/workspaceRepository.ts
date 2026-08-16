import type { Application } from "../../features/applications/types/application";
import type {
  JobPortal,
  WorkspaceNote,
} from "../../features/resources/types/resource";
import type { TotionDatabase } from "../database";

export type WorkspaceSnapshot = {
  applications: Application[];
  jobPortals: JobPortal[];
  notes: WorkspaceNote[];
};

export interface WorkspaceRepository {
  listJobPortals(): Promise<JobPortal[]>;
  createJobPortal(jobPortal: JobPortal): Promise<JobPortal>;
  updateJobPortal(jobPortal: JobPortal): Promise<JobPortal>;
  deleteJobPortal(id: string): Promise<void>;
  listNotes(): Promise<WorkspaceNote[]>;
  createNote(note: WorkspaceNote): Promise<WorkspaceNote>;
  updateNote(note: WorkspaceNote): Promise<WorkspaceNote>;
  deleteNote(id: string): Promise<void>;
  restore(snapshot: WorkspaceSnapshot): Promise<void>;
}

function sortNewestFirst<T extends { id: string; createdAt: string }>(
  items: T[],
) {
  return items.sort(
    (first, second) =>
      second.createdAt.localeCompare(first.createdAt) ||
      first.id.localeCompare(second.id),
  );
}

export class DexieWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly database: TotionDatabase) {}

  async listJobPortals() {
    return sortNewestFirst(await this.database.jobPortals.toArray());
  }

  async createJobPortal(jobPortal: JobPortal) {
    await this.database.jobPortals.add(jobPortal);
    return jobPortal;
  }

  async updateJobPortal(jobPortal: JobPortal) {
    const updatedCount = await this.database.jobPortals.update(
      jobPortal.id,
      jobPortal,
    );

    if (updatedCount === 0) {
      throw new Error("Portal não encontrado");
    }

    return jobPortal;
  }

  async deleteJobPortal(id: string) {
    await this.database.jobPortals.delete(id);
  }

  async listNotes() {
    return sortNewestFirst(await this.database.notes.toArray());
  }

  async createNote(note: WorkspaceNote) {
    await this.database.notes.add(note);
    return note;
  }

  async updateNote(note: WorkspaceNote) {
    const updatedCount = await this.database.notes.update(note.id, note);

    if (updatedCount === 0) {
      throw new Error("Anotação não encontrada");
    }

    return note;
  }

  async deleteNote(id: string) {
    await this.database.notes.delete(id);
  }

  async restore({ applications, jobPortals, notes }: WorkspaceSnapshot) {
    await this.database.transaction(
      "rw",
      [
        this.database.applications,
        this.database.jobPortals,
        this.database.notes,
      ],
      async () => {
        await Promise.all([
          this.database.applications.clear(),
          this.database.jobPortals.clear(),
          this.database.notes.clear(),
        ]);
        await Promise.all([
          applications.length > 0
            ? this.database.applications.bulkAdd(applications)
            : Promise.resolve(),
          jobPortals.length > 0
            ? this.database.jobPortals.bulkAdd(jobPortals)
            : Promise.resolve(),
          notes.length > 0
            ? this.database.notes.bulkAdd(notes)
            : Promise.resolve(),
        ]);
      },
    );
  }
}
