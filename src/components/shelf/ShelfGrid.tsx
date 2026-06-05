import { useState, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ShelfItemPreview } from './ShelfItemPreview';
import { getShelfTheme } from './shelfThemes';
import type { CollectionItem, Shelf, AttributeSchema } from '../../types';

interface Props {
  shelf: Shelf;
  items: CollectionItem[];
  schema: AttributeSchema;
  highlightItemId?: string | null;
  onDrop(itemId: string, row: number, col: number): void;
  onItemClick(item: CollectionItem): void;
  onLongPressStart?(item: CollectionItem, x: number, y: number): void;
  touchDragOverCell?: { row: number; col: number } | null;
  scrollRef?: React.Ref<HTMLDivElement>;
}

export const ShelfGrid = memo(function ShelfGrid({
  shelf, items, schema, highlightItemId, onDrop, onItemClick,
  onLongPressStart, touchDragOverCell, scrollRef,
}: Props) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const theme = getShelfTheme(shelf.theme);

  const boardStyle = {
    ...theme.board.style,
    ...(theme.id === 'solid' && shelf.theme_color
      ? { backgroundColor: shelf.theme_color }
      : {}),
  };

  // Memoize cellMap so it only rebuilds when items or shelf changes
  const cellMap = useMemo(() => {
    const map = new Map<string, CollectionItem[]>();
    items.forEach(item => {
      if (item.shelf_id === shelf.id && item.shelf_row !== null && item.shelf_col !== null) {
        const key = `${item.shelf_row}-${item.shelf_col}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      }
    });
    return map;
  }, [items, shelf.id]);

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    setDragOverCell(key);
  }

  function handleDrop(e: React.DragEvent, row: number, col: number) {
    e.preventDefault();
    setDragOverCell(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) onDrop(itemId, row, col);
  }

  return (
    <div
      ref={scrollRef}
      className={cn('overflow-auto', theme.board.className)}
      style={boardStyle}
    >
      <div
        className="grid gap-1.5 min-w-max"
        style={{ gridTemplateColumns: `auto repeat(${shelf.cols}, minmax(80px, 120px))` }}
      >
        {/* Column headers */}
        <div />
        {Array.from({ length: shelf.cols }, (_, c) => (
          <div
            key={c}
            className={cn('text-center text-[10px] font-semibold uppercase tracking-wider py-1', theme.labelClass)}
          >
            C{c + 1}
          </div>
        ))}

        {/* Rows */}
        {Array.from({ length: shelf.rows }, (_, r) => (
          <>
            <div
              key={`label-${r}`}
              className={cn('flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-wider', theme.labelClass)}
            >
              L{r + 1}
            </div>

            {Array.from({ length: shelf.cols }, (_, c) => {
              const key = `${r}-${c}`;
              const cellItems = cellMap.get(key) ?? [];
              const isDragOver = dragOverCell === key;
              const hasHighlight = cellItems.some(i => i.id === highlightItemId);
              const isTouchDragOver = touchDragOverCell?.row === r && touchDragOverCell?.col === c;

              return (
                <Cell
                  key={key}
                  cellKey={key}
                  row={r}
                  col={c}
                  items={cellItems}
                  schema={schema}
                  isDragOver={isDragOver}
                  isTouchDragOver={isTouchDragOver}
                  isHighlighted={hasHighlight}
                  cellBase={theme.cellBase}
                  plank={theme.plank}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={handleDrop}
                  onItemClick={onItemClick}
                  onLongPressStart={onLongPressStart}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
});

interface CellProps {
  cellKey: string;
  row: number;
  col: number;
  items: CollectionItem[];
  schema: AttributeSchema;
  isDragOver: boolean;
  isTouchDragOver: boolean;
  isHighlighted: boolean;
  cellBase: string;
  plank?: string;
  onDragOver(e: React.DragEvent, key: string): void;
  onDragLeave(): void;
  onDrop(e: React.DragEvent, row: number, col: number): void;
  onItemClick(item: CollectionItem): void;
  onLongPressStart?(item: CollectionItem, x: number, y: number): void;
}

function Cell({
  cellKey, row, col, items, schema, isDragOver, isTouchDragOver, isHighlighted,
  cellBase, plank, onDragOver, onDragLeave, onDrop, onItemClick, onLongPressStart,
}: CellProps) {
  return (
    <div
      data-cell-row={row}
      data-cell-col={col}
      onDragOver={e => onDragOver(e, cellKey)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, row, col)}
      className={cn(
        'relative min-h-[72px] rounded-md transition-all duration-150 p-1',
        isDragOver || isTouchDragOver
          ? 'border-2 border-primary bg-primary/10 scale-[1.02]'
          : isHighlighted
          ? 'border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-300'
          : cellBase,
        plank,
      )}
    >
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <span className="text-[10px] text-muted-foreground/40">vazio</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.slice(0, 3).map(item => (
            <CellItem
              key={item.id}
              item={item}
              schema={schema}
              onItemClick={onItemClick}
              onLongPressStart={onLongPressStart}
            />
          ))}
          {items.length > 3 && (
            <span className="text-[10px] text-muted-foreground text-center">
              +{items.length - 3} mais
            </span>
          )}
        </div>
      )}
      {items.length > 1 && (
        <span className="absolute top-0.5 right-0.5 text-[9px] bg-muted rounded px-1 text-muted-foreground font-medium">
          {items.length}
        </span>
      )}
    </div>
  );
}

function CellItem({
  item,
  schema,
  onItemClick,
  onLongPressStart,
}: {
  item: CollectionItem;
  schema: AttributeSchema;
  onItemClick(item: CollectionItem): void;
  onLongPressStart?(item: CollectionItem, x: number, y: number): void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivated = useRef(false);
  const touchActiveRef     = useRef(false);
  // Capture touch coords at touchstart for accurate ghost initial position
  const touchCoordsRef     = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function handleMouseEnter() {
    if (touchActiveRef.current) return; // suppress preview during touch interaction
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPreviewPos({ x: r.left, y: r.top });
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchActiveRef.current = true;
    longPressActivated.current = false;
    const touch = e.touches[0];
    touchCoordsRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true;
      setPreviewPos(null); // ensure preview is closed when drag activates
      onLongPressStart?.(item, touchCoordsRef.current.x, touchCoordsRef.current.y);
    }, 400);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchMove() {
    cancelLongPress();
  }

  function handleTouchEnd() {
    touchActiveRef.current = false;
    cancelLongPress();
  }

  return (
    <>
      <button
        ref={btnRef}
        draggable
        onDragStart={e => e.dataTransfer.setData('text/plain', item.id)}
        onClick={() => {
          if (longPressActivated.current) { longPressActivated.current = false; return; }
          onItemClick(item);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPreviewPos(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full flex items-center gap-1 rounded bg-card border px-1 py-1 text-[11px] hover:border-primary/50 hover:bg-accent transition-colors cursor-grab active:cursor-grabbing text-left"
        title={item.title}
      >
        {item.photo_url ? (
          <img src={item.photo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate leading-tight">{item.title}</span>
      </button>
      {previewPos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: previewPos.x, top: previewPos.y - 8, transform: 'translateY(-100%)' }}
        >
          <ShelfItemPreview item={item} schema={schema} />
        </div>,
        document.body,
      )}
    </>
  );
}
