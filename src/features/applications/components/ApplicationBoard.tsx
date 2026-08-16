import {
  type Announcements,
  type CollisionDetection,
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { type KeyboardEvent, useRef, useState } from "react";
import { notification } from "../../../shared/notifications";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
} from "../constants/applicationStatuses";
import {
  type ApplicationDropTarget,
  reorderApplications,
} from "../services/reorderApplications";
import type { Application } from "../types/application";
import { ApplicationColumn } from "./ApplicationColumn";
import { ApplicationDragOverlay } from "./ApplicationDragOverlay";

type ApplicationBoardProps = {
  applications: Application[];
  isLoading: boolean;
  onRequestEdit: (application: Application, trigger: HTMLButtonElement) => void;
  onRequestDelete: (
    application: Application,
    trigger: HTMLButtonElement,
  ) => void;
  onMoveStart: () => void;
  onMovePreview: (id: string, target: ApplicationDropTarget) => void;
  onMoveCommit: (id: string, target: ApplicationDropTarget) => Promise<void>;
  onMoveCancel: () => void;
};

function getDropTarget(
  active: DragOverEvent["active"],
  over: DragOverEvent["over"],
  applications: Application[],
  verticalDelta = 0,
): ApplicationDropTarget | null {
  if (!over) {
    return null;
  }

  const id = String(over.id);
  const columnPrefix = "application-column:";

  if (id.startsWith(columnPrefix)) {
    const status = id.slice(columnPrefix.length);

    if (
      status === "applied" ||
      status === "in_progress" ||
      status === "closed"
    ) {
      return { type: "column", status };
    }
  }

  if (!applications.some((application) => application.id === id)) {
    return null;
  }

  const activeRect = active.rect.current.translated;
  const edge = verticalDelta
    ? verticalDelta > 0
      ? "after"
      : "before"
    : activeRect &&
        activeRect.top + activeRect.height / 2 >
          over.rect.top + over.rect.height / 2
      ? "after"
      : "before";

  return { type: "application", id, edge };
}

function isSameDropTarget(
  first: ApplicationDropTarget | null,
  second: ApplicationDropTarget,
) {
  if (!first || first.type !== second.type) {
    return false;
  }

  if (first.type === "column" && second.type === "column") {
    return first.status === second.status;
  }

  return first.type === "application" && second.type === "application"
    ? first.id === second.id && first.edge === second.edge
    : false;
}

const collisionDetectionStrategy: CollisionDetection = (arguments_) => {
  if (arguments_.pointerCoordinates) {
    return pointerWithin(arguments_);
  }

  return closestCorners(arguments_);
};

export function ApplicationBoard({
  applications,
  isLoading,
  onRequestEdit,
  onRequestDelete,
  onMoveStart,
  onMovePreview,
  onMoveCommit,
  onMoveCancel,
}: ApplicationBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [keyboardActiveId, setKeyboardActiveId] = useState<string | null>(null);
  const [keyboardAnnouncement, setKeyboardAnnouncement] = useState("");
  const keyboardActiveIdRef = useRef<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const lastTargetRef = useRef<ApplicationDropTarget | null>(null);
  const isCommittingRef = useRef(false);
  const isKeyboardMoveRef = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeApplication = applications.find(
    (application) => application.id === (activeId ?? keyboardActiveId),
  );
  const announcements: Announcements = {
    onDragStart({ active }) {
      const application = applications.find(
        (candidate) => candidate.id === String(active.id),
      );
      return application
        ? `Você iniciou o movimento de ${application.name}.`
        : "Movimento iniciado.";
    },
    onDragOver({ active, over }) {
      const target = getDropTarget(active, over, applications);

      if (!target) {
        return "A candidatura não está sobre um destino válido.";
      }

      const preview = reorderApplications(
        applications,
        String(active.id),
        target,
      );
      const movedApplication = preview.find(
        (application) => application.id === String(active.id),
      );

      if (!movedApplication) {
        return undefined;
      }

      const totalInStatus = preview.filter(
        (application) => application.status === movedApplication.status,
      ).length;
      return `Posição ${movedApplication.position + 1} de ${totalInStatus} em ${APPLICATION_STATUS_LABELS[movedApplication.status]}.`;
    },
    onDragEnd({ over }) {
      return over
        ? "Candidatura solta. Salvando a nova posição."
        : "Destino inválido. A ordem anterior será restaurada.";
    },
    onDragCancel() {
      return "Movimento cancelado. A ordem anterior foi restaurada.";
    },
  };

  function startMove(event: DragStartEvent) {
    if (isCommittingRef.current) {
      return;
    }

    setActiveId(String(event.active.id));
    lastTargetRef.current = null;
    isKeyboardMoveRef.current = event.activatorEvent.type === "keydown";
    onMoveStart();
  }

  function previewMove(event: DragOverEvent) {
    const target = getDropTarget(
      event.active,
      event.over,
      applications,
      isKeyboardMoveRef.current ? event.delta.y : 0,
    );
    const activeApplicationId = String(event.active.id);

    if (target?.type === "application" && target.id === activeApplicationId) {
      return;
    }

    if (target && !isSameDropTarget(lastTargetRef.current, target)) {
      lastTargetRef.current = target;
      onMovePreview(activeApplicationId, target);
    }
  }

  function previewKeyboardMove(event: DragMoveEvent) {
    if (!isKeyboardMoveRef.current) {
      return;
    }

    const target = getDropTarget(
      event.active,
      event.over,
      applications,
      event.delta.y,
    );
    const activeApplicationId = String(event.active.id);

    if (
      target &&
      !(target.type === "application" && target.id === activeApplicationId) &&
      !isSameDropTarget(lastTargetRef.current, target)
    ) {
      lastTargetRef.current = target;
      onMovePreview(activeApplicationId, target);
    }
  }

  function finishMove(event: DragEndEvent) {
    const target = getDropTarget(
      event.active,
      event.over,
      applications,
      isKeyboardMoveRef.current ? event.delta.y : 0,
    );
    const movedId = String(event.active.id);
    setActiveId(null);
    lastTargetRef.current = null;
    isKeyboardMoveRef.current = false;

    if (!target) {
      onMoveCancel();
      return;
    }

    persistMove(movedId, target);
  }

  function persistMove(movedId: string, target: ApplicationDropTarget) {
    isCommittingRef.current = true;
    setIsCommitting(true);
    onMoveCommit(movedId, target)
      .then(() => {
        setKeyboardAnnouncement("Movimento salvo.");
      })
      .catch(() => {
        setKeyboardAnnouncement(
          "Não foi possível salvar. A ordem anterior foi restaurada.",
        );
        notification.error(
          "Não foi possível salvar o movimento. A ordem anterior foi restaurada.",
        );
      })
      .finally(() => {
        isCommittingRef.current = false;
        setIsCommitting(false);
      });
  }

  function announceTarget(id: string, target: ApplicationDropTarget) {
    const preview = reorderApplications(applications, id, target);
    const movedApplication = preview.find(
      (application) => application.id === id,
    );

    if (!movedApplication) {
      return;
    }

    const totalInStatus = preview.filter(
      (application) => application.status === movedApplication.status,
    ).length;
    setKeyboardAnnouncement(
      `Posição ${movedApplication.position + 1} de ${totalInStatus} em ${APPLICATION_STATUS_LABELS[movedApplication.status]}.`,
    );
  }

  function handleKeyboardDragKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    application: Application,
  ) {
    const supportedKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Escape",
    ];

    const isSpace =
      event.code === "Space" || event.key === " " || event.key === "Spacebar";

    if (!isSpace && !supportedKeys.includes(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (isSpace) {
      if (!keyboardActiveIdRef.current) {
        if (isCommittingRef.current) {
          return;
        }

        keyboardActiveIdRef.current = application.id;
        setKeyboardActiveId(application.id);
        lastTargetRef.current = null;
        onMoveStart();
        setKeyboardAnnouncement(
          `Você iniciou o movimento de ${application.name}.`,
        );
        return;
      }

      if (keyboardActiveIdRef.current === application.id) {
        const target = lastTargetRef.current;
        keyboardActiveIdRef.current = null;
        setKeyboardActiveId(null);

        if (target) {
          persistMove(application.id, target);
        } else {
          onMoveCancel();
          setKeyboardAnnouncement("Movimento cancelado sem alterações.");
        }
      }

      return;
    }

    if (keyboardActiveIdRef.current !== application.id) {
      return;
    }

    if (event.key === "Escape") {
      keyboardActiveIdRef.current = null;
      setKeyboardActiveId(null);
      lastTargetRef.current = null;
      onMoveCancel();
      setKeyboardAnnouncement(
        "Movimento cancelado. A ordem anterior foi restaurada.",
      );
      return;
    }

    let target: ApplicationDropTarget | null = null;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const applicationsInColumn = applications
        .filter((candidate) => candidate.status === application.status)
        .sort((first, second) => first.position - second.position);
      const currentIndex = applicationsInColumn.findIndex(
        (candidate) => candidate.id === application.id,
      );
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const overApplication = applicationsInColumn[currentIndex + direction];

      if (overApplication) {
        target = {
          type: "application",
          id: overApplication.id,
          edge: direction > 0 ? "after" : "before",
        };
      }
    } else {
      const currentStatusIndex = APPLICATION_STATUSES.indexOf(
        application.status,
      );
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const targetStatus = APPLICATION_STATUSES[currentStatusIndex + direction];

      if (targetStatus) {
        target = { type: "column", status: targetStatus };
      }
    }

    if (target) {
      lastTargetRef.current = target;
      onMovePreview(application.id, target);
      announceTarget(application.id, target);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para mover uma candidatura, pressione espaço. Use as setas para escolher a posição, espaço para soltar e Escape para cancelar.",
        },
      }}
      onDragStart={startMove}
      onDragMove={previewKeyboardMove}
      onDragOver={previewMove}
      onDragEnd={finishMove}
      onDragCancel={() => {
        setActiveId(null);
        lastTargetRef.current = null;
        isKeyboardMoveRef.current = false;
        onMoveCancel();
      }}
    >
      <section
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-5 sm:gap-5"
        aria-busy={isLoading || isCommitting}
        aria-label="Quadro de candidaturas"
      >
        {APPLICATION_STATUSES.map((status) => {
          const applicationsInStatus = applications
            .filter((application) => application.status === status)
            .sort((first, second) => first.position - second.position);

          return (
            <ApplicationColumn
              key={status}
              status={status}
              applications={applicationsInStatus}
              activeApplicationId={activeId ?? keyboardActiveId}
              isDragActive={Boolean(activeId ?? keyboardActiveId)}
              isDragDisabled={isCommitting}
              keyboardActiveId={keyboardActiveId}
              onKeyboardDragKeyDown={handleKeyboardDragKeyDown}
              onRequestEdit={onRequestEdit}
              onRequestDelete={onRequestDelete}
            />
          );
        })}
      </section>
      <DragOverlay dropAnimation={null} zIndex={60}>
        {activeId && activeApplication ? (
          <ApplicationDragOverlay application={activeApplication} />
        ) : null}
      </DragOverlay>
      <p className="sr-only" role="status" aria-live="polite">
        {keyboardAnnouncement}
      </p>
    </DndContext>
  );
}
