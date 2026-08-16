import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { notification } from "../../../shared/notifications";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
} from "../constants/applicationStatuses";
import type { NewApplication } from "../schemas/applicationSchema";
import {
  type ApplicationRowCorrection,
  type ImportStatusDecision,
  type ParsedApplicationCsv,
  parseApplicationCsv,
  prepareApplicationImport,
} from "../services/parseApplicationCsv";
import type { Application, ApplicationStatus } from "../types/application";

type ImportApplicationsDialogProps = {
  applications: Application[];
  onClose: () => void;
  onImport: (applications: NewApplication[]) => Promise<Application[]>;
};

const FIELD_CLASS_NAME =
  "mt-1.5 min-h-10 w-full rounded-button border border-line-strong bg-card px-3 py-2 text-sm text-ink focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15";

function getStatusLabel(status: string) {
  return status || "Status vazio";
}

export function ImportApplicationsDialog({
  applications,
  onClose,
  onImport,
}: ImportApplicationsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsedCsv, setParsedCsv] = useState<ParsedApplicationCsv | null>(null);
  const [statusDecisions, setStatusDecisions] = useState<
    Record<string, ImportStatusDecision | undefined>
  >({});
  const [corrections, setCorrections] = useState<
    Record<number, ApplicationRowCorrection | undefined>
  >({});
  const [ignoredRowNumbers, setIgnoredRowNumbers] = useState<Set<number>>(
    new Set(),
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const preview = parsedCsv
    ? prepareApplicationImport(parsedCsv, applications, {
        statusDecisions,
        corrections,
        ignoredRowNumbers,
      })
    : null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function requestClose() {
    if (!isImporting) {
      onClose();
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setFileError(null);
    setImportError(null);
    setStatusDecisions({});
    setCorrections({});
    setIgnoredRowNumbers(new Set());

    try {
      setParsedCsv(parseApplicationCsv(await file.text()));
    } catch {
      setParsedCsv(null);
      setFileError("Não foi possível ler o arquivo CSV selecionado.");
    }
  }

  function updateCorrection(
    rowNumber: number,
    correction: Partial<ApplicationRowCorrection>,
  ) {
    setCorrections((currentCorrections) => ({
      ...currentCorrections,
      [rowNumber]: {
        ...currentCorrections[rowNumber],
        ...correction,
      },
    }));
  }

  async function confirmImport() {
    if (!preview || preview.validRows.length === 0) {
      return;
    }

    setImportError(null);
    setIsImporting(true);

    try {
      const importedApplications = await onImport(
        preview.validRows.map((row) => row.input),
      );
      notification.success(
        importedApplications.length === 1
          ? "1 candidatura importada para o quadro."
          : `${importedApplications.length} candidaturas importadas para o quadro.`,
      );
      onClose();
    } catch {
      setImportError(
        "Não foi possível concluir a importação. Nenhuma candidatura foi adicionada.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  const hasBlockingErrors = Boolean(
    parsedCsv &&
      (parsedCsv.globalErrors.length > 0 ||
        (preview?.unresolvedStatuses.length ?? 0) > 0 ||
        (preview?.invalidRows.length ?? 0) > 0),
  );

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(64rem,calc(100%-1.5rem))] rounded-dialog border border-line bg-panel p-0 text-ink shadow-dialog"
      aria-labelledby="import-applications-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="border-b border-line px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="mb-1.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Importação assistida
            </p>
            <h2
              id="import-applications-title"
              className="font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl"
            >
              Importar candidaturas do CSV
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Revise os status, corrija linhas inválidas e confirme antes de
              adicionar os dados ao quadro.
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-xl leading-none text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
            onClick={requestClose}
            disabled={isImporting}
            aria-label="Fechar importação"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <div className="max-h-[min(72vh,48rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        <div className="rounded-card border border-line bg-card p-4">
          <label
            className="block text-sm font-bold text-ink"
            htmlFor="csv-file"
          >
            Arquivo CSV
          </label>
          <input
            id="csv-file"
            className="mt-2 block w-full text-sm text-muted file:mr-4 file:min-h-10 file:rounded-button file:border-0 file:bg-brand file:px-4 file:font-bold file:text-white"
            type="file"
            accept=".csv,text/csv"
            onChange={selectFile}
            disabled={isImporting}
          />
          {fileName ? (
            <p className="mt-2 text-xs text-muted">Arquivo: {fileName}</p>
          ) : null}
        </div>

        {fileError ? (
          <p
            className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {fileError}
          </p>
        ) : null}

        {parsedCsv?.globalErrors.map((error) => (
          <p
            key={error}
            className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ))}

        {parsedCsv && preview ? (
          <>
            <section className="mt-5" aria-labelledby="import-summary-title">
              <h3
                id="import-summary-title"
                className="font-display text-lg font-bold"
              >
                Resumo da prévia
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <SummaryItem label="Linhas" value={parsedCsv.rows.length} />
                <SummaryItem label="Prontas" value={preview.validRows.length} />
                <SummaryItem
                  label="Duplicadas"
                  value={preview.duplicateCount}
                />
                <SummaryItem
                  label="Inválidas"
                  value={preview.invalidRows.length}
                />
                <SummaryItem
                  label="Ignoradas"
                  value={preview.ignoredRows.length}
                />
              </dl>
            </section>

            {parsedCsv.unknownStatuses.length > 0 ? (
              <section
                className="mt-6"
                aria-labelledby="unknown-statuses-title"
              >
                <h3
                  id="unknown-statuses-title"
                  className="font-display text-lg font-bold"
                >
                  Decida os status desconhecidos
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Nenhum status é convertido sem sua confirmação.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {parsedCsv.unknownStatuses.map((status) => (
                    <label
                      key={status || "empty-status"}
                      className="rounded-card border border-line bg-card p-3 text-sm font-bold"
                    >
                      {getStatusLabel(status)}
                      <select
                        className={FIELD_CLASS_NAME}
                        value={statusDecisions[status] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setStatusDecisions((currentDecisions) => ({
                            ...currentDecisions,
                            [status]: value as ImportStatusDecision,
                          }));
                        }}
                        disabled={isImporting}
                      >
                        <option value="">Selecione uma decisão</option>
                        {APPLICATION_STATUSES.map((applicationStatus) => (
                          <option
                            key={applicationStatus}
                            value={applicationStatus}
                          >
                            {APPLICATION_STATUS_LABELS[applicationStatus]}
                          </option>
                        ))}
                        <option value="ignore">Ignorar essas linhas</option>
                      </select>
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            {preview.unresolvedStatuses.length === 0 &&
            preview.invalidRows.length > 0 ? (
              <section className="mt-6" aria-labelledby="invalid-rows-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3
                    id="invalid-rows-title"
                    className="font-display text-lg font-bold"
                  >
                    Corrija ou ignore as linhas inválidas
                  </h3>
                  <button
                    type="button"
                    className="min-h-10 rounded-button border border-line-strong bg-card px-3 text-xs font-bold"
                    onClick={() =>
                      setIgnoredRowNumbers((currentRows) => {
                        const nextRows = new Set(currentRows);
                        for (const row of preview.invalidRows) {
                          nextRows.add(row.source.rowNumber);
                        }
                        return nextRows;
                      })
                    }
                  >
                    Ignorar todas as inválidas
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {preview.invalidRows.map((row) => {
                    const correction = corrections[row.source.rowNumber];
                    return (
                      <article
                        key={row.source.rowNumber}
                        className="rounded-card border border-danger/25 bg-danger-soft/45 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-bold">
                            Linha {row.source.rowNumber}
                          </h4>
                          <button
                            type="button"
                            className="min-h-10 rounded-button border border-line-strong bg-card px-3 text-xs font-bold"
                            onClick={() =>
                              setIgnoredRowNumbers((currentRows) => {
                                const nextRows = new Set(currentRows);
                                nextRows.add(row.source.rowNumber);
                                return nextRows;
                              })
                            }
                          >
                            Ignorar linha
                          </button>
                        </div>
                        <ul className="mt-2 list-inside list-disc text-sm text-danger">
                          {row.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="text-xs font-bold">
                            Nome
                            <input
                              className={FIELD_CLASS_NAME}
                              value={correction?.name ?? row.source.name}
                              onChange={(event) =>
                                updateCorrection(row.source.rowNumber, {
                                  name: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs font-bold">
                            Data
                            <input
                              className={FIELD_CLASS_NAME}
                              value={
                                correction?.appliedAt ?? row.source.appliedAt
                              }
                              placeholder="YYYY-MM-DD"
                              onChange={(event) =>
                                updateCorrection(row.source.rowNumber, {
                                  appliedAt: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs font-bold">
                            Link
                            <input
                              className={FIELD_CLASS_NAME}
                              value={correction?.jobUrl ?? row.source.jobUrl}
                              onChange={(event) =>
                                updateCorrection(row.source.rowNumber, {
                                  jobUrl: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs font-bold">
                            Status
                            <select
                              className={FIELD_CLASS_NAME}
                              value={correction?.status ?? ""}
                              onChange={(event) =>
                                updateCorrection(row.source.rowNumber, {
                                  status: event.target
                                    .value as ApplicationStatus,
                                })
                              }
                            >
                              <option value="">Manter status do CSV</option>
                              {APPLICATION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {APPLICATION_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {ignoredRowNumbers.size > 0 ? (
              <section
                className="mt-6"
                aria-labelledby="manually-ignored-title"
              >
                <h3
                  id="manually-ignored-title"
                  className="font-display text-lg font-bold"
                >
                  Linhas ignoradas manualmente
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...ignoredRowNumbers].map((rowNumber) => (
                    <button
                      key={rowNumber}
                      type="button"
                      className="min-h-10 rounded-button border border-line bg-card px-3 text-xs font-bold"
                      onClick={() =>
                        setIgnoredRowNumbers((currentRows) => {
                          const nextRows = new Set(currentRows);
                          nextRows.delete(rowNumber);
                          return nextRows;
                        })
                      }
                    >
                      Revisar linha {rowNumber}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {preview.validRows.length > 0 ? (
              <section className="mt-6" aria-labelledby="valid-preview-title">
                <h3
                  id="valid-preview-title"
                  className="font-display text-lg font-bold"
                >
                  Candidaturas prontas para importar
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Exibindo até 10 linhas da prévia.
                </p>
                <div className="mt-3 overflow-x-auto rounded-card border border-line">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                    <thead className="bg-canvas-deep text-xs text-muted uppercase">
                      <tr>
                        <th className="px-3 py-2">Linha</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.validRows.slice(0, 10).map((row) => (
                        <tr
                          key={row.source.rowNumber}
                          className="border-t border-line"
                        >
                          <td className="px-3 py-2 tabular-nums">
                            {row.source.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-bold">
                            {row.input.name}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {row.input.appliedAt}
                          </td>
                          <td className="px-3 py-2">
                            {APPLICATION_STATUS_LABELS[row.input.status]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {importError ? (
          <p
            className="mt-5 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {importError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line bg-panel px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          className="min-h-11 rounded-button border border-line-strong bg-card px-5 text-sm font-bold"
          onClick={requestClose}
          disabled={isImporting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="min-h-11 rounded-button bg-brand px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          onClick={confirmImport}
          disabled={
            isImporting ||
            hasBlockingErrors ||
            (preview?.validRows.length ?? 0) === 0
          }
        >
          {isImporting
            ? "Importando..."
            : `Importar ${preview?.validRows.length ?? 0} candidaturas`}
        </button>
      </div>
    </dialog>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-card px-3 py-3">
      <dt className="text-xs font-bold text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-bold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
