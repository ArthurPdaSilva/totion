import { z } from "zod";
import { APPLICATION_STATUSES } from "../constants/applicationStatuses";
import { applicationSchema } from "../schemas/applicationSchema";
import type { Application } from "../types/application";

const BACKUP_FORMAT = "totion";
const BACKUP_VERSION = 1;
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

const backupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(BACKUP_VERSION),
    exportedAt: timestampSchema,
    applications: z.array(backupApplicationSchema),
  })
  .strict();

export type ApplicationBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  applications: Application[];
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

function hasValidIdentityAndPositions(applications: Application[]) {
  if (
    new Set(applications.map((application) => application.id)).size !==
    applications.length
  ) {
    return false;
  }

  return APPLICATION_STATUSES.every((status) =>
    applications
      .filter((application) => application.status === status)
      .sort((first, second) => first.position - second.position)
      .every((application, index) => application.position === index),
  );
}

export function createApplicationBackup(
  applications: Application[],
  exportedAt = new Date().toISOString(),
) {
  const backup: ApplicationBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    applications: sortApplications(applications),
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
    value.version !== BACKUP_VERSION
  ) {
    return {
      success: false,
      error: "O formato ou a versão deste backup não é compatível.",
    };
  }

  const parsedBackup = backupSchema.safeParse(value);

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

  if (!hasValidIdentityAndPositions(applications)) {
    return {
      success: false,
      error: "O backup contém IDs repetidos ou uma ordenação inválida.",
    };
  }

  return {
    success: true,
    backup: {
      ...parsedBackup.data,
      applications: sortApplications(applications),
    },
  };
}
