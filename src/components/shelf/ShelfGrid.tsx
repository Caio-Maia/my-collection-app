import { useState, useRef } from 'react';
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
}

export function ShelfGrid({ shelf, items, schema, highlightItemId, onDrop, onItemClick }: Props) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const theme = getShelfTheme(shelf.theme);

  const boardStyle = {
    ...theme.board.style,
    ...(theme.id === 'solid' && shelf.theme_color
      ? { backgroundColor: shelf.theme_color }
      : {}),
  };

  // Build lookup: `${row}-${col}` → items[]
  const cellMap = new Map<string, CollectionItem[]>();
  items.forEach(item => {
    if (item.shelf_id === shelf.id && item.shelf_row !== null && item.shelf_col !== null) {
      const key = `${item.shelf_row}-${item.shelf_col}`;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key)!.push(item);
    }
  });

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
            {/* Row label */}
            <div
              key={`label-${r}`}
              className={cn('flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-wider', theme.labelClass)}
            >
              L{r + 1}
            </div>

            {/* Cells */}
            {Array.from({ length: shelf.cols }, (_, c) => {
              const key = `${r}-${c}`;
              const cellItems = cellMap.get(key) ?? [];
              const isDragOver = dragOverCell === key;
              const hasHighlight = cellItems.some(i => i.id === highlightItemId);

              return (
                <Cell
                  key={key}
                  cellKey={key}
                  row={r}
                  col={c}
                  items={cellItems}
                  schema={schema}
                  isDragOver={isDragOver}
                  isHighlighted={hasHighlight}
                  cellBase={theme.cellBase}
                  plank={theme.plank}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={handleDrop}
                  onItemClick={onItemClick}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

interface CellProps {
  cellKey: string;
  row: number;
  col: number;
  items: CollectionItem[];
  schema: AttributeSchema;
  isDragOver: boolean;
  isHighlighted: boolean;
  cellBase: string;
  plank?: string;
  onDragOver(e: React.DragEvent, key: string): void;
  onDragLeave(): void;
  onDrop(e: React.DragEvent, row: number, col: number): void;
  onItemClick(item: CollectionItem): void;
}

function Cell({
  cellKey, row, col, items, schema, isDragOver, isHighlighted,
  cellBase, plank, onDragOver, onDragLeave, onDrop, onItemClick,
}: CellProps) {
  return (
    <div
      onDragOver={e => onDragOver(e, cellKey)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, row, col)}
      className={cn(
        'relative min-h-[72px] rounded-md transition-all duration-150 p-1',
        isDragOver
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
            <CellItem key={item.id} item={item} schema={schema} onItemClick={onItemClick} />
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
}: {
  item: CollectionItem;
  schema: AttributeSchema;
  onItemClick(item: CollectionItem): void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);

  function handleMouseEnter() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPreviewPos({ x: r.left, y: r.top });
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        draggable
        onDragStart={e => e.dataTransfer.setData('text/plain', item.id)}
        onClick={() => onItemClick(item)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPreviewPos(null)}
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
