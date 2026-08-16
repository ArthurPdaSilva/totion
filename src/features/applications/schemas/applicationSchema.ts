import { z } from "zod";
import { APPLICATION_STATUSES } from "../constants/applicationStatuses";

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function isValidCivilDate(value: string) {
  if (!CIVIL_DATE_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const daysByMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const maximumDay = daysByMonth[month - 1];

  return (
    month >= 1 &&
    month <= 12 &&
    maximumDay !== undefined &&
    day >= 1 &&
    day <= maximumDay
  );
}

function isValidJobUrl(value: string) {
  if (value.length === 0) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const applicationSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da vaga"),
  status: z.enum(APPLICATION_STATUSES, {
    error: "Selecione um status válido",
  }),
  appliedAt: z
    .string()
    .min(1, "Informe a data da aplicação")
    .refine(isValidCivilDate, "Informe uma data válida"),
  jobUrl: z
    .string()
    .trim()
    .refine(
      isValidJobUrl,
      "Informe um link completo começando com http:// ou https://",
    )
    .transform((value) => (value.length > 0 ? value : null)),
  notes: z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value.length > 0 ? value : null)),
});

export type ApplicationFormValues = z.input<typeof applicationSchema>;
export type NewApplication = z.output<typeof applicationSchema>;
