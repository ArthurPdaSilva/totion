export const APPLICATION_STATUSES = [
  "applied",
  "in_progress",
  "closed",
] as const;

export const APPLICATION_STATUS_LABELS = {
  applied: "Aplicada",
  in_progress: "Em andamento",
  closed: "Encerrada",
} as const;
