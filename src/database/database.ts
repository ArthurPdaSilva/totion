import Dexie, { type Table } from "dexie";
import type { Application } from "../features/applications/types/application";
import type {
  JobPortal,
  WorkspaceNote,
} from "../features/resources/types/resource";
import { registerInitialSchema } from "./migrations/001InitialSchema";
import { registerWorkspaceResources } from "./migrations/002WorkspaceResources";
import { registerWorkspaceNoteTitles } from "./migrations/003WorkspaceNoteTitles";

export class TotionDatabase extends Dexie {
  applications: Table<Application, string>;
  jobPortals: Table<JobPortal, string>;
  notes: Table<WorkspaceNote, string>;

  constructor(name = "totion") {
    super(name);
    registerInitialSchema(this);
    registerWorkspaceResources(this);
    registerWorkspaceNoteTitles(this);
    this.applications = this.table("applications");
    this.jobPortals = this.table("jobPortals");
    this.notes = this.table("notes");
  }
}

export const database = new TotionDatabase();
