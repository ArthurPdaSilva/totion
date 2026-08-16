import Dexie, { type Table } from "dexie";
import type { Application } from "../features/applications/types/application";
import { registerInitialSchema } from "./migrations/001InitialSchema";

export class TotionDatabase extends Dexie {
  applications: Table<Application, string>;

  constructor(name = "totion") {
    super(name);
    registerInitialSchema(this);
    this.applications = this.table("applications");
  }
}

export const database = new TotionDatabase();
