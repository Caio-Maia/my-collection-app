import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ShelfItemPreview } from './ShelfItemPreview';
import type { CollectionItem, AttributeSchema } from '../../types';

interface Props {
  items: CollectionItem[];
  schema: AttributeSchema;
  onDrop(itemId: string): void;
  onItemClick(item: CollectionItem): void;
  onLongPressStart?(item: CollectionItem, x: number, y: number): void;
}

export function UnplacedTray({ items, schema, onDrop, onItemClick, onLongPressStart }: Props) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) onDrop(itemId);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'rounded-lg border-2 border-dashed p-3 min-h-[80px] transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 bg-muted/20',
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Não posicionados ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-2">
          Todos os itens estão posicionados
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <TrayItem
              key={item.id}
              item={item}
              schema={schema}
              onClick={() => onItemClick(item)}
              onLongPressStart={onLongPressStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrayItem({
  item,
  schema,
  onClick,
  onLongPressStart,
}: {
  item: CollectionItem;
  schema: AttributeSchema;
  onClick(): void;
  onLongPressStart?(item: CollectionItem, x: number, y: number): void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivated = useRef(false);
  const touchActiveRef     = useRef(false);
  const touchCoordsRef     = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function handleMouseEnter() {
    if (touchActiveRef.current) return;
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
      setPreviewPos(null);
      onLongPressStart?.(item, touchCoordsRef.current.x, touchCoordsRef.current.y);
    }, 400);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
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
          onClick();
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPreviewPos(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={cancelLongPress}
        onTouchEnd={handleTouchEnd}
        className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
        title={item.title}
      >
        {item.photo_url ? (
          <img src={item.photo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="max-w-[120px] truncate">{item.title}</span>
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
