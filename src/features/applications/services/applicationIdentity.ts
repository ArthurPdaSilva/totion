import type { Application } from "../types/application";

type IdentifiableApplication = Pick<
  Application,
  "name" | "appliedAt" | "jobUrl"
>;

export function getApplicationIdentity(application: IdentifiableApplication) {
  let normalizedUrl = application.jobUrl?.trim() ?? "";

  if (normalizedUrl) {
    try {
      normalizedUrl = new URL(normalizedUrl).href;
    } catch {
      // Validation reports malformed URLs before this identity is persisted.
    }
  }

  return [
    application.name.trim().toLocaleLowerCase("pt-BR"),
    application.appliedAt,
    normalizedUrl,
  ].join("\u0000");
}
