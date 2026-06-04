import { Package } from 'lucide-react';
import { formatDuration } from '../AttributeInput';
import { sortedAttrs, normalize } from '../../lib/utils';
import type { CollectionItem, AttributeSchema, AttributeType } from '../../types';

interface Props {
  item: CollectionItem;
  schema: AttributeSchema;
}

export function ShelfItemPreview({ item, schema }: Props) {
  const attrs = sortedAttrs(item, schema).slice(0, 3);

  function displayValue(key: string, raw: string): string {
    const type = schema[normalize(key)]?.type as AttributeType | undefined;
    if (type === 'duration') {
      const mins = parseInt(raw);
      return isNaN(mins) ? raw : formatDuration(mins);
    }
    return raw;
  }

  return (
    <div className="w-48 bg-popover border rounded-lg shadow-lg overflow-hidden text-sm">
      {item.photo_url ? (
        <img src={item.photo_url} alt={item.title} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-muted flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="p-2 space-y-1">
        <p className="font-medium leading-tight line-clamp-2">{item.title}</p>
        {attrs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {attrs.map(([k, v]) => (
              <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {displayValue(k, v)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
