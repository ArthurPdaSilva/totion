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
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
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
  filteredApplications?: Application[];
  leadingColumn: ReactNode;
  trailingColumn: ReactNode;
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
  pointerY: number | null = null,
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
  const targetCenter = over.rect.top + over.rect.height / 2;
  const activeCenter = activeRect
    ? activeRect.top + activeRect.height / 2
    : null;
  const dropY = pointerY ?? activeCenter;
  const edge = verticalDelta
    ? verticalDelta > 0
      ? "after"
      : "before"
    : dropY !== null && dropY > targetCenter
      ? "after"
      : "before";

  return { type: "application", id, edge };
}

function getActivatorPoint(event: Event) {
  if (event instanceof MouseEvent) {
    return { x: event.clientX, y: event.clientY };
  }

  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  return null;
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
    const pointerCollisions = pointerWithin(arguments_).filter(
      (collision) => String(collision.id) !== String(arguments_.active.id),
    );
    const intersectionCollisions = rectIntersection(arguments_).filter(
      (collision) => String(collision.id) !== String(arguments_.active.id),
    );
    const pointerApplicationCollisions = pointerCollisions.filter(
      (collision) => !String(collision.id).startsWith("application-column:"),
    );
    const intersectionApplicationCollisions = intersectionCollisions.filter(
      (collision) => !String(collision.id).startsWith("application-column:"),
    );

    if (pointerApplicationCollisions.length > 0) {
      return pointerApplicationCollisions;
    }

    if (intersectionApplicationCollisions.length > 0) {
      return intersectionApplicationCollisions;
    }

    return pointerCollisions.length > 0
      ? pointerCollisions
      : intersectionCollisions;
  }

  return closestCorners(arguments_);
};

export function ApplicationBoard({
  applications,
  filteredApplications,
  leadingColumn,
  trailingColumn,
  isLoading,
  onRequestEdit,
  onRequestDelete,
  onMoveStart,
  onMovePreview,
  onMoveCommit,
  onMoveCancel,
}: ApplicationBoardProps) {
  const isFiltered = filteredApplications !== undefined;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [keyboardActiveId, setKeyboardActiveId] = useState<string | null>(null);
  const [keyboardAnnouncement, setKeyboardAnnouncement] = useState("");
  const [dropTarget, setDropTarget] = useState<ApplicationDropTarget | null>(
    null,
  );
  const keyboardActiveIdRef = useRef<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const lastTargetRef = useRef<ApplicationDropTarget | null>(null);
  const currentPointerRef = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    function trackPointer(event: MouseEvent | TouchEvent) {
      currentPointerRef.current = getActivatorPoint(event);
    }

    window.addEventListener("mousemove", trackPointer);
    window.addEventListener("touchmove", trackPointer, { passive: true });

    return () => {
      window.removeEventListener("mousemove", trackPointer);
      window.removeEventListener("touchmove", trackPointer);
    };
  }, []);
  const activeApplication = applications.find(
    (application) => application.id === (activeId ?? keyboardActiveId),
  );

  function getTargetStatus(target: ApplicationDropTarget | null) {
    if (!target) {
      return null;
    }

    if (target.type === "column") {
      return target.status;
    }

    return (
      applications.find((application) => application.id === target.id)
        ?.status ?? null
    );
  }

  function getColumnAtPoint(point: { x: number; y: number } | null) {
    if (!point) {
      return null;
    }

    for (const column of Array.from(
      boardRef.current?.querySelectorAll<HTMLElement>(
        "[data-application-column]",
      ) ?? [],
    )) {
      const bounds = column.getBoundingClientRect();

      if (
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom
      ) {
        return column;
      }
    }

    return null;
  }

  function getStatusAtPoint(point: { x: number; y: number } | null) {
    const status = getColumnAtPoint(point)?.dataset.applicationColumn;
    return (
      APPLICATION_STATUSES.find((candidate) => candidate === status) ?? null
    );
  }

  function getPointerDropTarget(
    point: { x: number; y: number } | null,
    activeApplicationId: string,
  ): ApplicationDropTarget | null {
    const column = getColumnAtPoint(point);
    const status = APPLICATION_STATUSES.find(
      (candidate) => candidate === column?.dataset.applicationColumn,
    );

    if (!point || !column || !status) {
      return null;
    }

    const cards = Array.from(
      column.querySelectorAll<HTMLElement>("[data-application-id]"),
    )
      .filter((card) => card.dataset.applicationId !== activeApplicationId)
      .map((card) => ({
        id: card.dataset.applicationId,
        bounds: card.getBoundingClientRect(),
      }))
      .filter(
        (card): card is { id: string; bounds: DOMRect } =>
          card.id !== undefined,
      )
      .sort((first, second) => first.bounds.top - second.bounds.top);

    if (cards.length === 0 || point.y >= (cards.at(-1)?.bounds.bottom ?? 0)) {
      return { type: "column", status };
    }

    const closestCard = cards.reduce((closest, card) => {
      const closestCenter = closest.bounds.top + closest.bounds.height / 2;
      const cardCenter = card.bounds.top + card.bounds.height / 2;
      return Math.abs(point.y - cardCenter) < Math.abs(point.y - closestCenter)
        ? card
        : closest;
    });
    const closestCenter =
      closestCard.bounds.top + closestCard.bounds.height / 2;

    return {
      type: "application",
      id: closestCard.id,
      edge: point.y > closestCenter ? "after" : "before",
    };
  }

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
      const target = isKeyboardMoveRef.current
        ? getDropTarget(active, over, applications)
        : getPointerDropTarget(currentPointerRef.current, String(active.id));

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
      const hasValidTarget = isKeyboardMoveRef.current
        ? Boolean(over ?? lastTargetRef.current)
        : getStatusAtPoint(currentPointerRef.current) !== null;
      return hasValidTarget
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
    setDropTarget(null);
    currentPointerRef.current = getActivatorPoint(event.activatorEvent);
    isKeyboardMoveRef.current = event.activatorEvent.type === "keydown";
    onMoveStart();
  }

  function updateMovePreview(
    event: DragMoveEvent | DragOverEvent,
    applyOptimisticPreview: boolean,
  ) {
    const pointerY = isKeyboardMoveRef.current
      ? null
      : (currentPointerRef.current?.y ?? null);
    const detectedTarget = getDropTarget(
      event.active,
      event.over,
      applications,
      pointerY,
      isKeyboardMoveRef.current ? event.delta.y : 0,
    );
    const activeApplicationId = String(event.active.id);
    const target = isKeyboardMoveRef.current
      ? detectedTarget
      : getPointerDropTarget(currentPointerRef.current, activeApplicationId);

    if (!target) {
      setDropTarget(null);
      return;
    }

    if (target?.type === "application" && target.id === activeApplicationId) {
      return;
    }

    setDropTarget(target);

    if (!isSameDropTarget(lastTargetRef.current, target)) {
      lastTargetRef.current = target;

      if (applyOptimisticPreview) {
        onMovePreview(activeApplicationId, target);
      }
    }
  }

  function previewMove(event: DragOverEvent) {
    updateMovePreview(event, isKeyboardMoveRef.current);
  }

  function previewMoveDuringDrag(event: DragMoveEvent) {
    updateMovePreview(event, isKeyboardMoveRef.current);
  }

  function finishMove(event: DragEndEvent) {
    const movedId = String(event.active.id);
    const pointerY = isKeyboardMoveRef.current
      ? null
      : (currentPointerRef.current?.y ?? null);
    const detectedTarget = getDropTarget(
      event.active,
      event.over,
      applications,
      pointerY,
      isKeyboardMoveRef.current ? event.delta.y : 0,
    );
    const lastTarget = lastTargetRef.current;
    const pointerTarget = isKeyboardMoveRef.current
      ? null
      : getPointerDropTarget(currentPointerRef.current, movedId);
    const stableDetectedTarget =
      event.over &&
      detectedTarget &&
      lastTarget &&
      isSameDropTarget(lastTarget, detectedTarget)
        ? detectedTarget
        : null;
    const target = isKeyboardMoveRef.current
      ? (lastTarget ?? detectedTarget)
      : (pointerTarget ?? stableDetectedTarget);
    console.log("[Totion DnD] drag end", {
      deltaY: event.delta.y,
      overId: event.over?.id ?? null,
      pointer: currentPointerRef.current,
      pointerY,
      pointerStatus: getTargetStatus(pointerTarget),
      detectedTarget,
      lastTarget,
      pointerTarget,
    });
    setActiveId(null);
    setDropTarget(null);
    lastTargetRef.current = null;
    currentPointerRef.current = null;
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
        setDropTarget(null);
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
        setDropTarget(null);

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
      setDropTarget(null);
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
      setDropTarget(target);
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
      onDragMove={previewMoveDuringDrag}
      onDragOver={previewMove}
      onDragEnd={finishMove}
      onDragCancel={() => {
        setActiveId(null);
        setDropTarget(null);
        lastTargetRef.current = null;
        currentPointerRef.current = null;
        isKeyboardMoveRef.current = false;
        onMoveCancel();
      }}
    >
      <section
        ref={boardRef}
        className={`flex gap-4 overflow-x-auto overscroll-x-contain pb-5 sm:gap-5 min-[1440px]:snap-none min-[1440px]:gap-3 min-[1440px]:overflow-x-clip min-[1440px]:pb-0 2xl:gap-4 ${(activeId ?? keyboardActiveId) ? "snap-none" : "snap-x snap-mandatory"}`}
        aria-busy={isLoading || isCommitting}
        aria-label="Quadro de candidaturas"
      >
        {leadingColumn}
        {APPLICATION_STATUSES.map((status) => {
          const applicationsInStatus = applications
            .filter((application) => application.status === status)
            .sort((first, second) => first.position - second.position);
          const displayedApplications = isFiltered
            ? (filteredApplications ?? []).filter(
                (application) => application.status === status,
              )
            : applicationsInStatus;

          return (
            <ApplicationColumn
              key={status}
              status={status}
              applications={displayedApplications}
              totalCount={applicationsInStatus.length}
              isFiltered={isFiltered}
              activeApplicationId={activeId ?? keyboardActiveId}
              isDragActive={Boolean(activeId ?? keyboardActiveId)}
              isDragDisabled={isCommitting || isFiltered}
              keyboardActiveId={keyboardActiveId}
              dropTarget={dropTarget}
              onKeyboardDragKeyDown={handleKeyboardDragKeyDown}
              onRequestEdit={onRequestEdit}
              onRequestDelete={onRequestDelete}
            />
          );
        })}
        {trailingColumn}
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
