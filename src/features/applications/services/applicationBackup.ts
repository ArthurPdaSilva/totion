import { z } from "zod";
import {
  jobPortalSchema,
  workspaceNoteSchema,
} from "../../resources/schemas/resourceSchemas";
import type { JobPortal, WorkspaceNote } from "../../resources/types/resource";
import { APPLICATION_STATUSES } from "../constants/applicationStatuses";
import { applicationSchema } from "../schemas/applicationSchema";
import type { Application } from "../types/application";

const BACKUP_FORMAT = "totion";
const BACKUP_VERSION = 3;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isValidUtcTimestamp(value: string) {
  if (!UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }

  const normalizedValue = value.includes(".")
    ? value
    : value.replace("Z", ".000Z");

  try {
    return new Date(value).toISOString() === normalizedValue;
  } catch {
    return false;
  }
}

const timestampSchema = z
  .string()
  .refine(isValidUtcTimestamp, "Instante inválido");

const backupApplicationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    status: z.enum(APPLICATION_STATUSES),
    appliedAt: z.string(),
    jobUrl: z.string().nullable(),
    notes: z.string().nullable(),
    position: z.number().int().nonnegative(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

const backupJobPortalSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    url: z.string(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

const legacyBackupWorkspaceNoteSchema = z
  .object({
    id: z.string().min(1),
    content: z.string(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

const backupWorkspaceNoteSchema = legacyBackupWorkspaceNoteSchema.extend({
  title: z.string().nullable(),
});

const legacyBackupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(1),
    exportedAt: timestampSchema,
    applications: z.array(backupApplicationSchema),
  })
  .strict();

const legacyResourcesBackupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(2),
    exportedAt: timestampSchema,
    applications: z.array(backupApplicationSchema),
    jobPortals: z.array(backupJobPortalSchema),
    notes: z.array(legacyBackupWorkspaceNoteSchema),
  })
  .strict();

const backupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(BACKUP_VERSION),
    exportedAt: timestampSchema,
    applications: z.array(backupApplicationSchema),
    jobPortals: z.array(backupJobPortalSchema),
    notes: z.array(backupWorkspaceNoteSchema),
  })
  .strict();

export type ApplicationBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  applications: Application[];
  jobPortals: JobPortal[];
  notes: WorkspaceNote[];
};

export type ApplicationBackupParseResult =
  | { success: true; backup: ApplicationBackup }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortApplications(applications: Application[]) {
  return [...applications].sort((first, second) => {
    const statusDifference =
      APPLICATION_STATUSES.indexOf(first.status) -
      APPLICATION_STATUSES.indexOf(second.status);

    return statusDifference || first.position - second.position;
  });
}

function sortNewestFirst<T extends { id: string; createdAt: string }>(
  items: T[],
) {
  return [...items].sort(
    (first, second) =>
      second.createdAt.localeCompare(first.createdAt) ||
      first.id.localeCompare(second.id),
  );
}

function hasUniqueIds(items: Array<{ id: string }>) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function hasValidApplicationPositions(applications: Application[]) {
  return APPLICATION_STATUSES.every((status) =>
    applications
      .filter((application) => application.status === status)
      .sort((first, second) => first.position - second.position)
      .every((application, index) => application.position === index),
  );
}

export function createApplicationBackup(
  {
    applications,
    jobPortals,
    notes,
  }: Pick<ApplicationBackup, "applications" | "jobPortals" | "notes">,
  exportedAt = new Date().toISOString(),
) {
  const backup: ApplicationBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    applications: sortApplications(applications),
    jobPortals: sortNewestFirst(jobPortals),
    notes: sortNewestFirst(notes),
  };

  return {
    content: `${JSON.stringify(backup, null, 2)}\n`,
    fileName: `totion-backup-${exportedAt.slice(0, 10)}.totion`,
  };
}

export function parseApplicationBackup(
  content: string,
): ApplicationBackupParseResult {
  let value: unknown;

  try {
    value = JSON.parse(content);
  } catch {
    return {
      success: false,
      error: "O arquivo não contém um backup Totion válido.",
    };
  }

  if (
    !isRecord(value) ||
    value.format !== BACKUP_FORMAT ||
    ![1, 2, BACKUP_VERSION].includes(Number(value.version))
  ) {
    return {
      success: false,
      error: "O formato ou a versão deste backup não é compatível.",
    };
  }

  const parsedBackup =
    value.version === 1
      ? legacyBackupSchema.safeParse(value)
      : value.version === 2
        ? legacyResourcesBackupSchema.safeParse(value)
        : backupSchema.safeParse(value);

  if (!parsedBackup.success) {
    return {
      success: false,
      error: "O backup contém dados ausentes ou inválidos.",
    };
  }

  const applications: Application[] = [];

  for (const application of parsedBackup.data.applications) {
    const parsedApplication = applicationSchema.safeParse({
      name: application.name,
      status: application.status,
      appliedAt: application.appliedAt,
      jobUrl: application.jobUrl ?? "",
      notes: application.notes ?? "",
    });

    if (!parsedApplication.success) {
      return {
        success: false,
        error: "O backup contém uma ou mais candidaturas inválidas.",
      };
    }

    applications.push({ ...application, ...parsedApplication.data });
  }

  if (
    !hasUniqueIds(applications) ||
    !hasValidApplicationPositions(applications)
  ) {
    return {
      success: false,
      error: "O backup contém IDs repetidos ou uma ordenação inválida.",
    };
  }

  const rawJobPortals =
    parsedBackup.data.version === 1 ? [] : parsedBackup.data.jobPortals;
  const rawNotes =
    parsedBackup.data.version === 1 ? [] : parsedBackup.data.notes;
  const jobPortals: JobPortal[] = [];
  const notes: WorkspaceNote[] = [];

  for (const jobPortal of rawJobPortals) {
    const parsedJobPortal = jobPortalSchema.safeParse(jobPortal);

    if (!parsedJobPortal.success) {
      return {
        success: false,
        error: "O backup contém um ou mais portais inválidos.",
      };
    }

    jobPortals.push({ ...jobPortal, ...parsedJobPortal.data });
  }

  for (const note of rawNotes) {
    const parsedNote = workspaceNoteSchema.safeParse({
      title: "title" in note ? (note.title ?? "") : "",
      content: note.content,
    });

    if (!parsedNote.success) {
      return {
        success: false,
        error: "O backup contém uma ou mais anotações inválidas.",
      };
    }

    notes.push({ ...note, ...parsedNote.data });
  }

  if (!hasUniqueIds(jobPortals) || !hasUniqueIds(notes)) {
    return {
      success: false,
      error: "O backup contém IDs repetidos.",
    };
  }

  return {
    success: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: parsedBackup.data.exportedAt,
      applications: sortApplications(applications),
      jobPortals: sortNewestFirst(jobPortals),
      notes: sortNewestFirst(notes),
    },
  };
}
