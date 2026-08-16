import { describe, expect, it } from "vitest";
import { formatCivilDate, getCurrentCivilDate } from "./civilDate";

describe("civilDate", () => {
  it("obtém a data usando o calendário local", () => {
    const localDate = new Date(2026, 0, 5, 23, 45);

    expect(getCurrentCivilDate(localDate)).toBe("2026-01-05");
  });

  it("formata uma data civil sem parsing de Date", () => {
    expect(formatCivilDate("2026-08-16")).toBe("16/08/2026");
  });
});
