import {
  type ReactNode,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";

type StaticListColumnProps<T extends { id: string }> = {
  id: string;
  title: string;
  items: T[];
  totalCount: number;
  isFiltered: boolean;
  emptyMessage: string;
  markerClassName: string;
  surfaceClassName: string;
  countClassName: string;
  addLabel: string;
  addButtonRef: React.RefObject<HTMLButtonElement | null>;
  onAdd: () => void;
  renderItem: (item: T) => ReactNode;
};

const ITEMS_BATCH_SIZE = 5;

export function StaticListColumn<T extends { id: string }>({
  id,
  title,
  items,
  totalCount,
  isFiltered,
  emptyMessage,
  markerClassName,
  surfaceClassName,
  countClassName,
  addLabel,
  addButtonRef,
  onAdd,
  renderItem,
}: StaticListColumnProps<T>) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_BATCH_SIZE);
  const visibleItems = items.slice(0, visibleCount);
  const hasMoreItems = visibleItems.length < items.length;
  const headingId = `column-${id}`;

  useEffect(() => {
    if (
      !hasMoreItems ||
      !loadMoreRef.current ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startTransition(() => {
            setVisibleCount((currentCount) =>
              Math.min(currentCount + ITEMS_BATCH_SIZE, items.length),
            );
          });
        }
      },
      { rootMargin: "0px 0px 240px" },
    );
    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMoreItems, items.length]);

  function loadMore() {
    startTransition(() => {
      setVisibleCount((currentCount) =>
        Math.min(currentCount + ITEMS_BATCH_SIZE, items.length),
      );
    });
  }

  return (
    <section
      className={`w-board-column shrink-0 snap-start rounded-panel border border-line p-3 sm:p-4 ${surfaceClassName}`}
      aria-labelledby={headingId}
    >
      <header className="mb-4 flex min-h-8 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${markerClassName}`}
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="truncate font-display text-lg font-bold tracking-[-0.015em] text-ink"
            tabIndex={-1}
          >
            {title}
          </h2>
        </div>
        <span
          className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-bold tabular-nums ${countClassName}`}
          role="status"
          aria-label={
            isFiltered
              ? `${items.length} de ${totalCount} itens encontrados`
              : `${totalCount} ${totalCount === 1 ? "item" : "itens"}`
          }
        >
          {isFiltered ? `${items.length}/${totalCount}` : totalCount}
        </span>
      </header>

      <button
        ref={addButtonRef}
        type="button"
        className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-button border border-line-strong bg-card px-3 text-sm font-bold text-ink transition hover:border-focus hover:bg-panel"
        onClick={onAdd}
      >
        <span className="text-lg leading-none" aria-hidden="true">
          +
        </span>
        {addLabel}
      </button>

      <div className="min-h-32 space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map(renderItem)
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-card border border-dashed border-line-strong bg-card/45 px-6 text-center text-sm leading-6 text-muted">
            {isFiltered ? "Nenhum resultado nesta lista." : emptyMessage}
          </div>
        )}
      </div>

      {hasMoreItems ? (
        <div
          ref={loadMoreRef}
          className="mt-4 rounded-card border border-dashed border-line-strong bg-card/45 px-3 py-3 text-center"
        >
          <p className="text-xs text-muted tabular-nums">
            Mostrando {visibleItems.length} de {items.length}
          </p>
          <button
            type="button"
            className="mt-2 min-h-10 rounded-button px-3 text-sm font-bold text-ink transition hover:bg-card"
            onClick={loadMore}
          >
            Carregar mais
          </button>
        </div>
      ) : null}
    </section>
  );
}
