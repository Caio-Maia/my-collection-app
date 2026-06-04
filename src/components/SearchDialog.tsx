import { useState, useEffect, useRef } from 'react';
import { Search, X, Package } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { cn, normalize, sortedAttrs } from '../lib/utils';
import { formatDuration } from './AttributeInput';
import type { CollectionItem, AttributeSchema } from '../types';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  items: CollectionItem[];
  attributeSchema: AttributeSchema;
  onSelect(item: CollectionItem): void;
}

export function SearchDialog({ open, onOpenChange, items, attributeSchema, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const normalizedSchema: AttributeSchema = {};
  Object.entries(attributeSchema).forEach(([k, v]) => { normalizedSchema[normalize(k)] = v; });

  const results = query.trim()
    ? items.filter(item => {
        const q = normalize(query);
        return (
          normalize(item.title).includes(q) ||
          normalize(item.description).includes(q) ||
          Object.values(item.attributes ?? {}).some(v => normalize(v).includes(q))
        );
      })
    : [];

  function handleSelect(item: CollectionItem) {
    onOpenChange(false);
    onSelect(item);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar itens..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Digite para buscar entre {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado para "{query}"
            </p>
          ) : (
            <div className="divide-y">
              {results.map(item => {
                const attrs = sortedAttrs(item, normalizedSchema).slice(0, 3);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/60 transition-colors text-left"
                  >
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.title}
                        className="h-11 w-11 rounded-md object-cover border shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                      )}
                      {attrs.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {attrs.map(([k, v]) => {
                            const display = normalizedSchema[normalize(k)]?.type === 'duration'
                              ? formatDuration(parseInt(v)) || v : v;
                            return (
                              <span key={k} className={cn(
                                'text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground',
                                normalize(display).includes(normalize(query)) && 'bg-primary/15 text-primary',
                              )}>
                                {display}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              <p className="px-4 py-2 text-center text-xs text-muted-foreground">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
