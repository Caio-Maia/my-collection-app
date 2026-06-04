import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn, normalize } from '../lib/utils';
import {
  normTag, tagLabel, collectTags, collectTagsByKey,
  isAllNumeric, looksLikeYears, autoRanges, getDecades,
  DURATION_PRESETS, IMDB_PRESETS, RATING_ATTR_KEYS, TEXT_MAX_CHIPS,
  type RangeFilter,
} from '../lib/itemFilters';
import type { CollectionItem, AttributeSchema } from '../types';

interface Props {
  items: CollectionItem[];
  normalizedSchema: AttributeSchema;
  activeTags: Set<string>;
  onToggleTag(displayTag: string): void;
  activeRanges: RangeFilter[];
  onToggleRange(r: RangeFilter): void;
  hasActiveFilters: boolean;
  onClearFilters(): void;
  showFilters: boolean;
}

export function ItemFilterPanel({
  items, normalizedSchema,
  activeTags, onToggleTag,
  activeRanges, onToggleRange,
  hasActiveFilters, onClearFilters,
  showFilters,
}: Props) {
  const [customRange, setCustomRange] = useState<Record<string, { from: string; to: string; open: boolean }>>({});
  const [tagSearch, setTagSearch] = useState<Record<string, string>>({});

  const allTags = useMemo(() => collectTags(items), [items]);
  const tagsByKey = useMemo(() => collectTagsByKey(allTags), [allTags]);

  function applyCustomRange(key: string) {
    const cr = customRange[key];
    if (!cr) return;
    const from = parseFloat(cr.from);
    const to = parseFloat(cr.to);
    if (isNaN(from) || isNaN(to) || from > to) return;
    onToggleRange({ key, from, to, label: `${from}–${to}` });
    setCustomRange(prev => ({ ...prev, [key]: { ...prev[key], from: '', to: '', open: false } }));
  }

  function handleRemoveTag(normTagStr: string) {
    const display = allTags.find(t => {
      const { key, value } = tagLabel(t);
      return normTag(key, value) === normTagStr;
    });
    onToggleTag(display ?? normTagStr);
  }

  if (!showFilters) {
    if (!hasActiveFilters) return null;
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground">Filtrando:</span>
        {Array.from(activeTags).map(normTagStr => {
          const display = allTags.find(t => {
            const { key, value } = tagLabel(t);
            return normTag(key, value) === normTagStr;
          });
          const { key, value } = display ? tagLabel(display) : tagLabel(normTagStr);
          return (
            <button
              key={normTagStr}
              onClick={() => handleRemoveTag(normTagStr)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <span className="opacity-70">{key}:</span>
              <span>{value}</span>
              <X className="h-2.5 w-2.5 ml-0.5" />
            </button>
          );
        })}
        {activeRanges.map(r => (
          <button
            key={`${r.key}-${r.from}-${r.to}`}
            onClick={() => onToggleRange(r)}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <span className="opacity-70">{r.key}:</span>
            <span>{r.label}</span>
            <X className="h-2.5 w-2.5 ml-0.5" />
          </button>
        ))}
        <button onClick={onClearFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
          limpar tudo
        </button>
      </div>
    );
  }

  if (tagsByKey.size === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtrar</p>
        {hasActiveFilters && (
          <button onClick={onClearFilters} className="text-xs text-primary hover:underline">Limpar tudo</button>
        )}
      </div>

      {Array.from(tagsByKey.entries()).map(([normKey, { displayKey, values }]) => {
        const cfg = normalizedSchema[normKey];
        const isDuration = cfg?.type === 'duration';
        const isRating   = RATING_ATTR_KEYS.has(normKey);
        const isYear     = !isRating && (cfg?.type === 'year' || (!isDuration && isAllNumeric(values) && looksLikeYears(values)));
        const isNumeric  = !isYear && !isDuration && !isRating && isAllNumeric(values);
        const cr = customRange[normKey] ?? { from: '', to: '', open: false };
        const key = normKey;

        const RangeButtons = ({ presets }: { presets: Array<{ label: string; from: number; to: number }> }) => {
          const customActive = activeRanges.filter(
            r => r.key === key && !presets.some(p => p.from === r.from && p.to === r.to),
          );
          return (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCustomRange(p => ({ ...p, [key]: { ...cr, open: !cr.open } }))}
                  className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                    cr.open ? 'bg-secondary border-secondary-foreground/20' : 'bg-background border-input hover:border-primary/50 hover:bg-accent',
                  )}
                >
                  De / Até
                </button>
                {customActive.map(r => (
                  <button key={`${r.from}-${r.to}`} onClick={() => onToggleRange(r)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground border-primary shadow-sm transition-all">
                    {r.label} <X className="h-2.5 w-2.5 ml-0.5" />
                  </button>
                ))}
                {presets.map(d => {
                  const active = activeRanges.some(r => r.key === key && r.from === d.from && r.to === d.to);
                  return (
                    <button key={d.label} onClick={() => onToggleRange({ key, ...d })}
                      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                        active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-input hover:border-primary/50 hover:bg-accent',
                      )}>
                      {d.label}{active && <X className="h-2.5 w-2.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
              {cr.open && (
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="De" value={cr.from}
                    onChange={e => setCustomRange(p => ({ ...p, [key]: { ...cr, from: e.target.value } }))}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <span className="text-muted-foreground text-sm">–</span>
                  <input type="number" placeholder="Até" value={cr.to}
                    onChange={e => setCustomRange(p => ({ ...p, [key]: { ...cr, to: e.target.value } }))}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <Button size="sm" className="h-8" onClick={() => applyCustomRange(key)}>Aplicar</Button>
                </div>
              )}
            </div>
          );
        };

        return (
          <div key={key} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{displayKey}</p>
            {isYear ? (
              <RangeButtons presets={getDecades(values)} />
            ) : isDuration ? (
              <RangeButtons presets={DURATION_PRESETS} />
            ) : isRating ? (
              <RangeButtons presets={IMDB_PRESETS} />
            ) : isNumeric ? (
              <RangeButtons presets={autoRanges(values)} />
            ) : values.length > TEXT_MAX_CHIPS ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar valor..."
                    value={tagSearch[normKey] ?? ''}
                    onChange={e => setTagSearch(p => ({ ...p, [normKey]: e.target.value }))}
                    className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {values
                    .filter(v => !tagSearch[normKey] || normalize(v).includes(normalize(tagSearch[normKey])))
                    .map(value => {
                      const tag = `${displayKey}::${value}`;
                      const active = activeTags.has(normTag(displayKey, value));
                      return (
                        <button key={tag} onClick={() => onToggleTag(tag)}
                          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                            active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-input hover:border-primary/50 hover:bg-accent',
                          )}>
                          {value}{active && <X className="h-2.5 w-2.5 ml-0.5" />}
                        </button>
                      );
                    })}
                </div>
                <p className="text-[10px] text-muted-foreground">{values.length} valores únicos</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {values.map(value => {
                  const tag = `${displayKey}::${value}`;
                  const active = activeTags.has(normTag(displayKey, value));
                  return (
                    <button key={tag} onClick={() => onToggleTag(tag)}
                      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                        active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-input hover:border-primary/50 hover:bg-accent',
                      )}>
                      {value}{active && <X className="h-2.5 w-2.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
