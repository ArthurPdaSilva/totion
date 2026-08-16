import { describe, expect, it } from "vitest";
import type { Application } from "../types/application";
import {
  parseApplicationCsv,
  prepareApplicationImport,
} from "./parseApplicationCsv";

const CSV_HEADER = "Name,Aplicado em,Link,Status";

function createApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "existing-application",
    name: "Pessoa desenvolvedora",
    status: "applied",
    appliedAt: "2026-08-16",
    jobUrl: "https://empresa.example/vaga",
    notes: null,
    position: 0,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("parseApplicationCsv", () => {
  it("interpreta campos entre aspas, datas inglesas e os três status conhecidos", () => {
    const parsedCsv = parseApplicationCsv(`${CSV_HEADER}
"Pessoa desenvolvedora, Front-end","August 6, 2026",https://empresa.example/front,Aplicada
Pessoa de produto,"January 15, 2026",,Em Andamento
Pessoa de qualidade,"December 31, 2025",https://empresa.example/qa,Encerrado`);
    const preview = prepareApplicationImport(parsedCsv, [], {
      statusDecisions: {},
    });

    expect(parsedCsv.globalErrors).toEqual([]);
    expect(parsedCsv.unknownStatuses).toEqual([]);
    expect(preview.invalidRows).toEqual([]);
    expect(preview.validRows.map((row) => row.input)).toMatchObject([
      {
        name: "Pessoa desenvolvedora, Front-end",
        appliedAt: "2026-08-06",
        status: "applied",
      },
      {
        name: "Pessoa de produto",
        appliedAt: "2026-01-15",
        status: "in_progress",
        jobUrl: null,
      },
      {
        name: "Pessoa de qualidade",
        appliedAt: "2025-12-31",
        status: "closed",
      },
    ]);
  });

  it("exige uma decisão para status desconhecido e permite corrigir a linha", () => {
    const parsedCsv = parseApplicationCsv(`${CSV_HEADER}
Pessoa de dados,data inválida,link inválido,Entrevista`);
    const unresolvedPreview = prepareApplicationImport(parsedCsv, [], {
      statusDecisions: {},
    });

    expect(parsedCsv.unknownStatuses).toEqual(["Entrevista"]);
    expect(unresolvedPreview.unresolvedStatuses).toEqual(["Entrevista"]);
    expect(unresolvedPreview.invalidRows[0]?.errors).toContain(
      "Escolha como importar o status desta linha.",
    );

    const correctedPreview = prepareApplicationImport(parsedCsv, [], {
      statusDecisions: { Entrevista: "in_progress" },
      corrections: {
        2: {
          appliedAt: "2026-08-16",
          jobUrl: "https://empresa.example/dados",
        },
      },
    });

    expect(correctedPreview.unresolvedStatuses).toEqual([]);
    expect(correctedPreview.invalidRows).toEqual([]);
    expect(correctedPreview.validRows[0]?.input).toMatchObject({
      status: "in_progress",
      appliedAt: "2026-08-16",
      jobUrl: "https://empresa.example/dados",
    });
  });

  it("separa duplicatas existentes, repetidas no arquivo e linhas ignoradas", () => {
    const parsedCsv = parseApplicationCsv(`${CSV_HEADER}
Pessoa desenvolvedora,"August 16, 2026",https://empresa.example/vaga,Aplicada
Nova candidatura,"August 17, 2026",,Aplicada
Nova candidatura,"August 17, 2026",,Encerrado
Linha auxiliar,"August 18, 2026",,Portais`);
    const preview = prepareApplicationImport(parsedCsv, [createApplication()], {
      statusDecisions: { Portais: "ignore" },
    });

    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]?.input.name).toBe("Nova candidatura");
    expect(preview.duplicateCount).toBe(2);
    expect(preview.ignoredRows).toHaveLength(1);
  });

  it("ignora os status não importáveis do quadro de origem", () => {
    const parsedCsv = parseApplicationCsv(`${CSV_HEADER}
Linha sem status,"August 16, 2026",,
Linha de anotação,"August 16, 2026",,Anotações
Linha de entrevista,"August 16, 2026",,Entrevista/Teste Técnico
Linha de portal,"August 16, 2026",,Portais de Vagas`);
    const preview = prepareApplicationImport(parsedCsv, [], {
      statusDecisions: {},
    });

    expect(parsedCsv.unknownStatuses).toEqual([]);
    expect(preview.ignoredRows).toHaveLength(4);
    expect(preview.validRows).toEqual([]);
  });

  it("informa cabeçalhos obrigatórios ausentes", () => {
    const parsedCsv = parseApplicationCsv("Nome,Data\nVaga,2026-08-16");

    expect(parsedCsv.globalErrors).toContain(
      'A coluna obrigatória "Name" não foi encontrada.',
    );
    expect(parsedCsv.globalErrors).toContain(
      'A coluna obrigatória "Status" não foi encontrada.',
    );
  });
});
