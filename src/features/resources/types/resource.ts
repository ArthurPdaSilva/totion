export type JobPortal = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceNote = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};
