import Papa from "papaparse";
import type { NewApplication } from "../schemas/applicationSchema";
import { applicationSchema } from "../schemas/applicationSchema";
import type { Application, ApplicationStatus } from "../types/application";
import { getApplicationIdentity } from "./applicationIdentity";

const REQUIRED_HEADERS = ["Name", "Aplicado em", "Link", "Status"] as const;

const ENGLISH_MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const KNOWN_STATUSES: Record<string, ApplicationStatus> = {
  applied: "applied",
  aplicada: "applied",
  in_progress: "in_progress",
  "em andamento": "in_progress",
  closed: "closed",
  encerrada: "closed",
  encerrado: "closed",
};

const IGNORED_SOURCE_STATUSES = new Set([
  "",
  "anotações",
  "entrevista/teste técnico",
  "portais de vagas",
]);

export type CsvApplicationRow = {
  rowNumber: number;
  name: string;
  appliedAt: string;
  jobUrl: string;
  sourceStatus: string;
  parsingErrors: string[];
};

export type ParsedApplicationCsv = {
  rows: CsvApplicationRow[];
  globalErrors: string[];
  unknownStatuses: string[];
};

export type ImportStatusDecision = ApplicationStatus | "ignore";

export type ApplicationRowCorrection = Partial<
  Pick<CsvApplicationRow, "name" | "appliedAt" | "jobUrl">
> & {
  status?: ApplicationStatus;
};

type PreparedRowBase = {
  source: CsvApplicationRow;
};

export type PreparedApplicationImportRow =
  | (PreparedRowBase & { outcome: "valid"; input: NewApplication })
  | (PreparedRowBase & { outcome: "duplicate"; input: NewApplication })
  | (PreparedRowBase & { outcome: "invalid"; errors: string[] })
  | (PreparedRowBase & { outcome: "ignored" });

export type PreparedApplicationImport = {
  rows: PreparedApplicationImportRow[];
  validRows: Extract<PreparedApplicationImportRow, { outcome: "valid" }>[];
  duplicateCount: number;
  invalidRows: Extract<PreparedApplicationImportRow, { outcome: "invalid" }>[];
  ignoredRows: Extract<PreparedApplicationImportRow, { outcome: "ignored" }>[];
  unresolvedStatuses: string[];
};

function normalizeStatus(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function getKnownStatusDecision(
  value: string,
): ImportStatusDecision | undefined {
  const normalizedStatus = normalizeStatus(value);
  return (
    KNOWN_STATUSES[normalizedStatus] ??
    (IGNORED_SOURCE_STATUSES.has(normalizedStatus) ? "ignore" : undefined)
  );
}

function convertCsvDate(value: string) {
  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const match = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(trimmedValue);

  if (!match) {
    return trimmedValue;
  }

  const [, monthName, day, year] = match;
  const month = monthName ? ENGLISH_MONTHS[monthName.toLowerCase()] : undefined;

  return month && day && year
    ? `${year}-${month}-${day.padStart(2, "0")}`
    : trimmedValue;
}

export function parseApplicationCsv(csvText: string): ParsedApplicationCsv {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const headers = result.meta.fields ?? [];
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  const globalErrors = missingHeaders.map(
    (header) => `A coluna obrigatória "${header}" não foi encontrada.`,
  );
  const parsingErrorRows = new Set(
    result.errors.flatMap((error) =>
      error.row === undefined ? [] : [error.row + 2],
    ),
  );

  if (result.errors.some((error) => error.row === undefined)) {
    globalErrors.push(
      "Não foi possível interpretar a estrutura do arquivo CSV.",
    );
  }

  const rows = result.data.map((data, index) => {
    const rowNumber = index + 2;
    return {
      rowNumber,
      name: String(data.Name ?? ""),
      appliedAt: String(data["Aplicado em"] ?? ""),
      jobUrl: String(data.Link ?? ""),
      sourceStatus: String(data.Status ?? "").trim(),
      parsingErrors: parsingErrorRows.has(rowNumber)
        ? ["Não foi possível interpretar esta linha do CSV."]
        : [],
    };
  });
  const unknownStatuses = [
    ...new Set(
      rows.flatMap((row) =>
        getKnownStatusDecision(row.sourceStatus) ? [] : [row.sourceStatus],
      ),
    ),
  ].sort((first, second) => first.localeCompare(second, "pt-BR"));

  return { rows, globalErrors, unknownStatuses };
}

type PrepareApplicationImportOptions = {
  statusDecisions: Record<string, ImportStatusDecision | undefined>;
  corrections?: Record<number, ApplicationRowCorrection | undefined>;
  ignoredRowNumbers?: ReadonlySet<number>;
};

export function prepareApplicationImport(
  parsedCsv: ParsedApplicationCsv,
  existingApplications: Application[],
  {
    statusDecisions,
    corrections = {},
    ignoredRowNumbers = new Set(),
  }: PrepareApplicationImportOptions,
): PreparedApplicationImport {
  const identities = new Set(existingApplications.map(getApplicationIdentity));
  const unresolvedStatuses = parsedCsv.unknownStatuses.filter(
    (status) => statusDecisions[status] === undefined,
  );
  const rows: PreparedApplicationImportRow[] = parsedCsv.rows.map((source) => {
    if (ignoredRowNumbers.has(source.rowNumber)) {
      return { source, outcome: "ignored" };
    }

    const correction = corrections[source.rowNumber];
    const status =
      correction?.status ??
      getKnownStatusDecision(source.sourceStatus) ??
      statusDecisions[source.sourceStatus];

    if (status === "ignore") {
      return { source, outcome: "ignored" };
    }

    const errors = [...source.parsingErrors];

    if (!status) {
      errors.push("Escolha como importar o status desta linha.");
    }

    const parsedApplication = applicationSchema.safeParse({
      name: correction?.name ?? source.name,
      status: status ?? source.sourceStatus,
      appliedAt: convertCsvDate(correction?.appliedAt ?? source.appliedAt),
      jobUrl: correction?.jobUrl ?? source.jobUrl,
      notes: "",
    });

    if (!parsedApplication.success) {
      errors.push(
        ...parsedApplication.error.issues.map((issue) => issue.message),
      );
    }

    if (errors.length > 0 || !parsedApplication.success) {
      return { source, outcome: "invalid", errors: [...new Set(errors)] };
    }

    const input = parsedApplication.data;
    const identity = getApplicationIdentity(input);

    if (identities.has(identity)) {
      return { source, outcome: "duplicate", input };
    }

    identities.add(identity);
    return { source, outcome: "valid", input };
  });

  return {
    rows,
    validRows: rows.filter(
      (row): row is Extract<typeof row, { outcome: "valid" }> =>
        row.outcome === "valid",
    ),
    duplicateCount: rows.filter((row) => row.outcome === "duplicate").length,
    invalidRows: rows.filter(
      (row): row is Extract<typeof row, { outcome: "invalid" }> =>
        row.outcome === "invalid",
    ),
    ignoredRows: rows.filter(
      (row): row is Extract<typeof row, { outcome: "ignored" }> =>
        row.outcome === "ignored",
    ),
    unresolvedStatuses,
  };
}
