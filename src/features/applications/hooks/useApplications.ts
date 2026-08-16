import { useEffect, useState } from "react";
import type { ApplicationsRepository } from "../../../database/repositories/applicationsRepository";
import type { NewApplication } from "../schemas/applicationSchema";
import { createApplication } from "../services/createApplication";
import { deleteApplication } from "../services/deleteApplication";
import type { Application } from "../types/application";

type ApplicationsState =
  | { status: "loading"; applications: Application[] }
  | { status: "ready"; applications: Application[] }
  | { status: "error"; applications: Application[] };

export function useApplications(repository: ApplicationsRepository) {
  const [state, setState] = useState<ApplicationsState>({
    status: "loading",
    applications: [],
  });
  const [reloadKey, setReloadKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey intentionally starts a fresh read.
  useEffect(() => {
    let isCurrentRequest = true;

    setState((currentState) => ({
      status: "loading",
      applications: currentState.applications,
    }));

    repository
      .list()
      .then((applications) => {
        if (isCurrentRequest) {
          setState({ status: "ready", applications });
        }
      })
      .catch(() => {
        if (isCurrentRequest) {
          setState((currentState) => ({
            status: "error",
            applications: currentState.applications,
          }));
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [repository, reloadKey]);

  async function addApplication(input: NewApplication) {
    const application = await createApplication(repository, input);

    setState((currentState) => ({
      status: "ready",
      applications: [...currentState.applications, application],
    }));

    return application;
  }

  async function removeApplication(id: string) {
    const reorderedApplications = await deleteApplication(repository, id);
    const reorderedApplicationsById = new Map(
      reorderedApplications.map((application) => [application.id, application]),
    );

    setState((currentState) => ({
      status: "ready",
      applications: currentState.applications
        .filter((application) => application.id !== id)
        .map(
          (application) =>
            reorderedApplicationsById.get(application.id) ?? application,
        ),
    }));
  }

  function reload() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  return {
    ...state,
    addApplication,
    removeApplication,
    reload,
  };
}
