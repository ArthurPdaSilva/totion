import { useEffect, useState } from "react";
import type { WorkspaceRepository } from "../../../database/repositories/workspaceRepository";
import type {
  JobPortalInput,
  WorkspaceNoteInput,
} from "../schemas/resourceSchemas";
import type { JobPortal, WorkspaceNote } from "../types/resource";

type WorkspaceResourcesState =
  | { status: "loading"; jobPortals: JobPortal[]; notes: WorkspaceNote[] }
  | { status: "ready"; jobPortals: JobPortal[]; notes: WorkspaceNote[] }
  | { status: "error"; jobPortals: JobPortal[]; notes: WorkspaceNote[] };

export function useWorkspaceResources(repository: WorkspaceRepository) {
  const [state, setState] = useState<WorkspaceResourcesState>({
    status: "loading",
    jobPortals: [],
    notes: [],
  });
  const [reloadKey, setReloadKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey intentionally starts a fresh read.
  useEffect(() => {
    let isCurrentRequest = true;

    setState((currentState) => ({
      ...currentState,
      status: "loading",
    }));

    Promise.all([repository.listJobPortals(), repository.listNotes()])
      .then(([jobPortals, notes]) => {
        if (isCurrentRequest) {
          setState({ status: "ready", jobPortals, notes });
        }
      })
      .catch(() => {
        if (isCurrentRequest) {
          setState((currentState) => ({
            ...currentState,
            status: "error",
          }));
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [repository, reloadKey]);

  async function addJobPortal(input: JobPortalInput) {
    const now = new Date().toISOString();
    const jobPortal = await repository.createJobPortal({
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    setState((currentState) => ({
      ...currentState,
      status: "ready",
      jobPortals: [jobPortal, ...currentState.jobPortals],
    }));
    return jobPortal;
  }

  async function editJobPortal(id: string, input: JobPortalInput) {
    const currentJobPortal = state.jobPortals.find(
      (jobPortal) => jobPortal.id === id,
    );

    if (!currentJobPortal) {
      throw new Error("Portal não encontrado");
    }

    const updatedJobPortal = await repository.updateJobPortal({
      ...currentJobPortal,
      ...input,
      updatedAt: new Date().toISOString(),
    });
    setState((currentState) => ({
      ...currentState,
      status: "ready",
      jobPortals: currentState.jobPortals.map((jobPortal) =>
        jobPortal.id === id ? updatedJobPortal : jobPortal,
      ),
    }));
  }

  async function removeJobPortal(id: string) {
    await repository.deleteJobPortal(id);
    setState((currentState) => ({
      ...currentState,
      status: "ready",
      jobPortals: currentState.jobPortals.filter(
        (jobPortal) => jobPortal.id !== id,
      ),
    }));
  }

  async function addNote(input: WorkspaceNoteInput) {
    const now = new Date().toISOString();
    const note = await repository.createNote({
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    setState((currentState) => ({
      ...currentState,
      status: "ready",
      notes: [note, ...currentState.notes],
    }));
    return note;
  }

  async function editNote(id: string, input: WorkspaceNoteInput) {
    const currentNote = state.notes.find((note) => note.id === id);

    if (!currentNote) {
      throw new Error("Anotação não encontrada");
    }

    const updatedNote = await repository.updateNote({
      ...currentNote,
      ...input,
      updatedAt: new Date().toISOString(),
    });
    setState((currentState) => ({
      ...currentState,
      status: "ready",
      notes: currentState.notes.map((note) =>
        note.id === id ? updatedNote : note,
      ),
    }));
  }

  async function removeNote(id: string) {
    await repository.deleteNote(id);
    setState((currentState) => ({
      ...currentState,
      status: "ready",
      notes: currentState.notes.filter((note) => note.id !== id),
    }));
  }

  function acceptRestoredResources(
    jobPortals: JobPortal[],
    notes: WorkspaceNote[],
  ) {
    setState({ status: "ready", jobPortals, notes });
  }

  function reload() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  return {
    ...state,
    addJobPortal,
    editJobPortal,
    removeJobPortal,
    addNote,
    editNote,
    removeNote,
    acceptRestoredResources,
    reload,
  };
}
