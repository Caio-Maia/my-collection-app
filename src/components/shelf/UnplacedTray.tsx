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
}

export function UnplacedTray({ items, schema, onDrop, onItemClick }: Props) {
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
            <TrayItem key={item.id} item={item} schema={schema} onClick={() => onItemClick(item)} />
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
}: {
  item: CollectionItem;
  schema: AttributeSchema;
  onClick(): void;
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
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPreviewPos(null)}
        className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
        title={item.title}
      >
        {item.photo_url ? (
          <img src={item.photo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
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
