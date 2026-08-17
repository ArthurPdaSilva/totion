import { z } from "zod";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const jobPortalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do portal"),
  url: z
    .string()
    .trim()
    .min(1, "Informe o link do portal")
    .refine(
      isValidHttpUrl,
      "Informe um link completo começando com http:// ou https://",
    ),
});

export const workspaceNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null)),
  content: z.string().trim().min(1, "Escreva o conteúdo da anotação"),
});

export type JobPortalInput = z.output<typeof jobPortalSchema>;
export type WorkspaceNoteFormValues = z.input<typeof workspaceNoteSchema>;
export type WorkspaceNoteInput = z.output<typeof workspaceNoteSchema>;
