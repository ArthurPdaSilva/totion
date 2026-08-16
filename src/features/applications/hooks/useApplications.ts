import { useEffect, useRef, useState } from "react";
import type { ApplicationsRepository } from "../../../database/repositories/applicationsRepository";
import type { NewApplication } from "../schemas/applicationSchema";
import { createApplication } from "../services/createApplication";
import { deleteApplication } from "../services/deleteApplication";
import { moveApplication } from "../services/moveApplication";
import {
  type ApplicationDropTarget,
  reorderApplications,
} from "../services/reorderApplications";
import { updateApplication } from "../services/updateApplication";
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
  const applicationsRef = useRef<Application[]>([]);
  const movementSnapshotRef = useRef<Application[] | null>(null);
  const isMoveCommitPendingRef = useRef(false);

  useEffect(() => {
    applicationsRef.current = state.applications;
  }, [state.applications]);

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

  async function editApplication(id: string, input: NewApplication) {
    const changedApplications = await updateApplication(repository, id, input);
    const changedApplicationsById = new Map(
      changedApplications.map((application) => [application.id, application]),
    );

    setState((currentState) => ({
      status: "ready",
      applications: currentState.applications.map(
        (application) =>
          changedApplicationsById.get(application.id) ?? application,
      ),
    }));
  }

  function beginApplicationMove() {
    if (isMoveCommitPendingRef.current) {
      return;
    }

    movementSnapshotRef.current = applicationsRef.current;
  }

  function previewApplicationMove(id: string, target: ApplicationDropTarget) {
    if (isMoveCommitPendingRef.current) {
      return;
    }

    const reorderedApplications = reorderApplications(
      applicationsRef.current,
      id,
      target,
    );
    applicationsRef.current = reorderedApplications;
    setState({ status: "ready", applications: reorderedApplications });
  }

  async function commitApplicationMove(
    id: string,
    target: ApplicationDropTarget,
  ) {
    if (isMoveCommitPendingRef.current) {
      throw new Error("Já existe um movimento sendo salvo");
    }

    const snapshot = movementSnapshotRef.current;
    const reorderedApplications = reorderApplications(
      applicationsRef.current,
      id,
      target,
    );
    const movedApplication = reorderedApplications.find(
      (application) => application.id === id,
    );
    const previousApplication = snapshot?.find(
      (application) => application.id === id,
    );

    if (!movedApplication) {
      cancelApplicationMove();
      return;
    }

    applicationsRef.current = reorderedApplications;
    setState({ status: "ready", applications: reorderedApplications });

    if (
      previousApplication?.status === movedApplication.status &&
      previousApplication.position === movedApplication.position
    ) {
      movementSnapshotRef.current = null;
      return;
    }

    isMoveCommitPendingRef.current = true;

    try {
      const changedApplications = await moveApplication(
        repository,
        id,
        movedApplication.status,
        movedApplication.position,
      );
      const changedApplicationsById = new Map(
        changedApplications.map((application) => [application.id, application]),
      );
      const persistedApplications = reorderedApplications.map(
        (application) =>
          changedApplicationsById.get(application.id) ?? application,
      );
      applicationsRef.current = persistedApplications;
      setState({ status: "ready", applications: persistedApplications });
      movementSnapshotRef.current = null;
    } catch (error) {
      if (snapshot) {
        applicationsRef.current = snapshot;
        setState({ status: "ready", applications: snapshot });
      }

      movementSnapshotRef.current = null;
      throw error;
    } finally {
      isMoveCommitPendingRef.current = false;
    }
  }

  function cancelApplicationMove() {
    const snapshot = movementSnapshotRef.current;

    if (snapshot) {
      applicationsRef.current = snapshot;
      setState({ status: "ready", applications: snapshot });
    }

    movementSnapshotRef.current = null;
  }

  function reload() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  return {
    ...state,
    addApplication,
    beginApplicationMove,
    cancelApplicationMove,
    commitApplicationMove,
    editApplication,
    previewApplicationMove,
    removeApplication,
    reload,
  };
}
