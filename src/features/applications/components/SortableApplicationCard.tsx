import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type KeyboardEvent, useEffect, useRef } from "react";
import type { Application } from "../types/application";
import { ApplicationCard } from "./ApplicationCard";

type SortableApplicationCardProps = {
  application: Application;
  dropEdge: "before" | "after" | null;
  isDragDisabled: boolean;
  isKeyboardDragging: boolean;
  onKeyboardDragKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    application: Application,
  ) => void;
  onRequestEdit: (application: Application, trigger: HTMLButtonElement) => void;
  onRequestDelete: (
    application: Application,
    trigger: HTMLButtonElement,
  ) => void;
};

export function SortableApplicationCard({
  application,
  dropEdge,
  isDragDisabled,
  isKeyboardDragging,
  onKeyboardDragKeyDown,
  onRequestEdit,
  onRequestDelete,
}: SortableApplicationCardProps) {
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id, disabled: isDragDisabled });

  useEffect(() => {
    if (isKeyboardDragging) {
      dragHandleRef.current?.focus();
    }
  }, [isKeyboardDragging]);

  return (
    <div
      ref={setNodeRef}
      data-application-id={application.id}
      className={`relative ${isDragging ? "opacity-25" : isKeyboardDragging ? "rounded-card ring-3 ring-focus/35" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {dropEdge ? (
        <span
          className={`pointer-events-none absolute right-2 left-2 z-20 h-0.5 rounded-full bg-focus ${dropEdge === "before" ? "-top-1.5" : "-bottom-1.5"}`}
          aria-hidden="true"
        />
      ) : null}
      <ApplicationCard
        application={application}
        onRequestEdit={onRequestEdit}
        onRequestDelete={onRequestDelete}
        dragHandle={
          <button
            ref={(node) => {
              dragHandleRef.current = node;
              setActivatorNodeRef(node);
            }}
            type="button"
            className="flex h-10 w-10 touch-none items-center justify-center rounded-button text-muted opacity-70 transition hover:bg-canvas-deep hover:text-ink hover:opacity-100 focus-visible:opacity-100 min-[1440px]:h-8 min-[1440px]:w-8 2xl:h-10 2xl:w-10"
            title="Mover candidatura"
            disabled={isDragDisabled}
            {...attributes}
            {...listeners}
            onKeyDown={(event) => {
              onKeyboardDragKeyDown(event, application);
            }}
            aria-label={`Mover candidatura ${application.name}`}
            aria-roledescription="candidatura arrastável"
            aria-keyshortcuts="Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape"
          >
            <DragHandleIcon />
          </button>
        }
      />
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
