import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Upload, Search, Package,
  LayoutGrid, LayoutList, ArrowUpAZ, ArrowDownAZ,
  CalendarArrowUp, CalendarArrowDown, X, SlidersHorizontal,
} from 'lucide-react';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ItemDialog } from '../components/ItemDialog';
import { ItemForm } from '../components/ItemForm';
import { ImportDialog } from '../components/ImportDialog';
import { EmptyState } from '../components/EmptyState';
import { cn } from '../lib/utils';
import type { CollectionItem, AttributeSchema } from '../types';
import { formatDate, normalize } from '../lib/utils';
import { formatDuration } from '../components/AttributeInput';
import { toast } from 'sonner';

type ViewMode = 'list' | 'grid';
type SortKey = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc';

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: 'date-desc', label: 'Mais recentes', icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: 'date-asc',  label: 'Mais antigos',  icon: <CalendarArrowUp   className="h-3.5 w-3.5" /> },
  { value: 'title-asc', label: 'A → Z',         icon: <ArrowUpAZ         className="h-3.5 w-3.5" /> },
  { value: 'title-desc',label: 'Z → A',         icon: <ArrowDownAZ       className="h-3.5 w-3.5" /> },
];

function sortItems(items: CollectionItem[], sort: SortKey): CollectionItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'title-asc':  return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      case 'date-asc':   return a.created_at.localeCompare(b.created_at);
      case 'date-desc':  return b.created_at.localeCompare(a.created_at);
    }
  });
}

/** Normalized tag id: "normalizedKey::normalizedValue" (used in activeTags Set). */
function normTag(key: string, value: string): string {
  return `${normalize(key)}::${normalize(value)}`;
}

/**
 * Collect unique tags from items.
 * Deduplication is case-insensitive; the first occurrence's casing is kept for display.
 */
function collectTags(items: CollectionItem[]): string[] {
  const seen   = new Set<string>(); // normalized ids for dedup
  const result: string[] = [];
  items.forEach((item) => {
    Object.entries(item.attributes ?? {}).forEach(([k, v]) => {
      if (!k.trim() || !v.trim()) return;
      const norm = normTag(k, v);
      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(`${k.trim()}::${v.trim()}`);
      }
    });
  });
  return result.sort((a, b) => a.localeCompare(b));
}

function tagLabel(tag: string) {
  const idx = tag.indexOf('::');
  return { key: tag.slice(0, idx), value: tag.slice(idx + 2) };
}

interface RangeFilter { key: string; from: number; to: number; label: string; }

/** activeTags stores normalized ids ("normalizedKey::normalizedValue"). */
function itemMatchesTags(item: CollectionItem, tags: Set<string>): boolean {
  if (tags.size === 0) return true;
  const itemTags = new Set(
    Object.entries(item.attributes ?? {}).map(([k, v]) => normTag(k, v))
  );
  for (const t of tags) if (itemTags.has(t)) return true;
  return false;
}

function itemMatchesRanges(item: CollectionItem, ranges: RangeFilter[]): boolean {
  if (ranges.length === 0) return true;
  const byKey = new Map<string, RangeFilter[]>();
  ranges.forEach(r => { if (!byKey.has(r.key)) byKey.set(r.key, []); byKey.get(r.key)!.push(r); });
  for (const [normKey, keyRanges] of byKey.entries()) {
    // Case-insensitive attribute lookup (normKey is lowercase, item key may differ)
    const entry = Object.entries(item.attributes ?? {}).find(([k]) => normalize(k) === normKey);
    if (!entry) return false;
    const num = parseFloat(entry[1]);
    if (isNaN(num)) return false;
    if (!keyRanges.some(r => num >= r.from && num <= r.to)) return false;
  }
  return true;
}

/** True when every non-empty value in the list parses as a finite number. */
function isAllNumeric(values: string[]): boolean {
  return values.length > 0 && values.every(v => v.trim() !== '' && isFinite(parseFloat(v)));
}

/** True when numeric values all fall in the typical year range (1800–2200). */
function looksLikeYears(values: string[]): boolean {
  const nums = values.map(v => parseInt(v)).filter(n => !isNaN(n));
  return nums.length > 0 && nums.every(n => n >= 1800 && n <= 2200);
}

const ATTR_TYPE_ORDER: Record<string, number> = { year: 0, person: 1, duration: 2, text: 3 };

/** Return item attributes sorted by schema type priority (year → person → duration → text → unschema'd). */
function sortedAttrs(
  item: CollectionItem,
  schema: Record<string, { type: string }>,
): Array<[string, string]> {
  return Object.entries(item.attributes ?? {}).sort(([ka], [kb]) => {
    const ta = ATTR_TYPE_ORDER[schema[normalize(ka)]?.type] ?? 4;
    const tb = ATTR_TYPE_ORDER[schema[normalize(kb)]?.type] ?? 4;
    return ta - tb;
  });
}

/** Generate up to 4 evenly-spaced intervals from a set of numeric values. */
function autoRanges(values: string[]): Array<{ label: string; from: number; to: number }> {
  const nums = values.map(v => parseFloat(v)).filter(n => isFinite(n));
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ label: String(min), from: min, to: max }];
  const range = max - min;
  // With very few distinct values, each value is its own "range"
  if (range <= 8) {
    return [...new Set(nums)].sort((a, b) => a - b).map(n => ({ label: String(n), from: n, to: n }));
  }
  // Round step up to a "nice" magnitude
  const rawStep = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / mag) * mag;
  const start = Math.floor(min / step) * step;
  const result: Array<{ label: string; from: number; to: number }> = [];
  for (let i = 0; i < 5; i++) {
    const from = start + i * step;
    const to   = from + step - 1;
    if (from > max) break;
    result.push({ label: `${from}–${Math.min(to, Math.ceil(max))}`, from, to: i === 4 ? Infinity : to });
  }
  return result;
}

function getDecades(values: string[]): Array<{ label: string; from: number; to: number }> {
  const set = new Set<number>();
  values.forEach(v => { const y = parseInt(v); if (!isNaN(y)) set.add(Math.floor(y / 10) * 10); });
  return Array.from(set).sort().map(d => ({
    label: d >= 2000 ? String(d) : String(d % 100),
    from: d,
    to: d + 9,
  }));
}

const DURATION_PRESETS = [
  { label: '< 60 min',    from: 0,   to: 59   },
  { label: '60–90 min',   from: 60,  to: 90   },
  { label: '90–120 min',  from: 91,  to: 120  },
  { label: '> 120 min',   from: 121, to: Infinity },
];

const TEXT_MAX_CHIPS = 8;

function usePersistedViewMode(collectionId: string | undefined): [ViewMode, (v: ViewMode) => void] {
  const key = `collection-view-${collectionId}`;
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = collectionId ? localStorage.getItem(key) : null;
    return (stored === 'grid' || stored === 'list') ? stored : 'list';
  });
  const setViewMode = (v: ViewMode) => {
    if (collectionId) localStorage.setItem(key, v);
    setViewModeState(v);
  };
  return [viewMode, setViewMode];
}

export function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = usePersistedViewMode(id);
  const [sortBy, setSortBy]             = useState<SortKey>('date-desc');
  const [activeTags, setActiveTags]     = useState<Set<string>>(new Set());
  const [activeRanges, setActiveRanges] = useState<RangeFilter[]>([]);
  const [customRange, setCustomRange]   = useState<Record<string, { from: string; to: string; open: boolean }>>({});
  const [tagSearch, setTagSearch]       = useState<Record<string, string>>({});
  const [showFilters, setShowFilters]   = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [addOpen, setAddOpen]           = useState(false);
  const [importOpen, setImportOpen]     = useState(false);

  const { data: collection, isLoading: loadingCol } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => data.getCollection(id!),
    enabled: !!id,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', id],
    queryFn: () => data.listItems(id!),
    enabled: !!id,
  });

  const addMutation = useMutation({
    mutationFn: (vals: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>) =>
      data.createItem(id!, user!.id, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', id] });
      qc.invalidateQueries({ queryKey: ['activities', user?.id] });
      setAddOpen(false);
      toast.success('Item adicionado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allTags = useMemo(() => collectTags(items), [items]);

  // tagsByKey: normalized key → { displayKey (first seen casing), values[] }
  const tagsByKey = useMemo(() => {
    const map = new Map<string, { displayKey: string; values: string[] }>();
    allTags.forEach(tag => {
      const { key, value } = tagLabel(tag);
      const nk = normalize(key);
      if (!map.has(nk)) map.set(nk, { displayKey: key, values: [] });
      map.get(nk)!.values.push(value);
    });
    return map;
  }, [allTags]);

  // autocompleteValues: normalized key → unique display values
  const autocompleteValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    items.forEach(item => {
      Object.entries(item.attributes ?? {}).forEach(([key, value]) => {
        const nk = normalize(key);
        if (!map[nk]) map[nk] = [];
        if (value && !map[nk].includes(value)) map[nk].push(value);
      });
    });
    return map;
  }, [items]);

  // attributeKeyDisplays: normalized key → display key (first-seen casing)
  const attributeKeyDisplays = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach(item => {
      Object.keys(item.attributes ?? {}).forEach(key => {
        const nk = normalize(key);
        if (!map[nk]) map[nk] = key.trim();
      });
    });
    return map;
  }, [items]);

  const attributeSchema = (collection?.attribute_schema ?? {}) as AttributeSchema;

  // normalizedSchema: normalized key → config (for case-insensitive schema lookup)
  const normalizedSchema = useMemo(() => {
    const result: AttributeSchema = {};
    Object.entries(attributeSchema).forEach(([k, v]) => { result[normalize(k)] = v; });
    return result;
  }, [attributeSchema]);

  const processed = useMemo(() => {
    const q = search.toLowerCase();
    const afterSearch = items.filter(
      (item) =>
        normalize(item.title).includes(q) ||
        normalize(item.description).includes(q) ||
        Object.values(item.attributes ?? {}).some(v => normalize(v).includes(q))
    );
    const afterTags   = afterSearch.filter(item => itemMatchesTags(item, activeTags));
    const afterRanges = afterTags.filter(item => itemMatchesRanges(item, activeRanges));
    return sortItems(afterRanges, sortBy);
  }, [items, search, activeTags, activeRanges, sortBy]);

  function toggleTag(tag: string) {
    const { key, value } = tagLabel(tag);
    const norm = normTag(key, value);
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(norm) ? next.delete(norm) : next.add(norm);
      return next;
    });
  }

  function toggleRange(r: RangeFilter) {
    setActiveRanges(prev => {
      const exists = prev.some(x => x.key === r.key && x.from === r.from && x.to === r.to);
      return exists ? prev.filter(x => !(x.key === r.key && x.from === r.from && x.to === r.to)) : [...prev, r];
    });
  }

  function applyCustomRange(key: string) {
    const cr = customRange[key];
    if (!cr) return;
    const from = parseFloat(cr.from);
    const to   = parseFloat(cr.to);
    if (isNaN(from) || isNaN(to) || from > to) return;
    toggleRange({ key, from, to, label: `${from}–${to}` });
    setCustomRange(prev => ({ ...prev, [key]: { ...prev[key], from: '', to: '', open: false } }));
  }

  function clearFilters() {
    setActiveTags(new Set());
    setActiveRanges([]);
    setCustomRange({});
    setTagSearch({});
    setSearch('');
  }

  const hasActiveFilters = activeTags.size > 0 || activeRanges.length > 0 || search.length > 0;
  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy)!;

  if (loadingCol) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Coleção não encontrada.</p>
        <Link to="/collections" className="text-primary hover:underline text-sm mt-2 inline-block">
          Voltar para coleções
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/collections">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{collection.name}</h1>
          {collection.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{collection.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {hasActiveFilters && processed.length !== items.length && (
              <span className="text-primary font-medium"> · {processed.length} visíveis</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar itens..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            {allTags.length > 0 && (
              <Button
                variant={showFilters || activeTags.size > 0 ? 'secondary' : 'outline'}
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeTags.size > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                    {activeTags.size}
                  </span>
                )}
              </Button>
            )}

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent transition-colors"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currentSort.icon}
              </div>
            </div>

            {/* View toggle */}
            <div className="flex shrink-0 rounded-md border border-input overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center justify-center w-9 h-9 transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent text-muted-foreground'
                )}
                title="Lista"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center justify-center w-9 h-9 transition-colors border-l border-input',
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent text-muted-foreground'
                )}
                title="Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Smart filter panel */}
          {showFilters && tagsByKey.size > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtrar</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpar tudo</button>
                )}
              </div>

              {Array.from(tagsByKey.entries()).map(([normKey, { displayKey, values }]) => {
                const cfg        = normalizedSchema[normKey];
                const isDuration = cfg?.type === 'duration';
                const isYear     = cfg?.type === 'year' ||
                  (!isDuration && isAllNumeric(values) && looksLikeYears(values));
                const isNumeric  = !isYear && !isDuration && isAllNumeric(values);
                const cr         = customRange[normKey] ?? { from: '', to: '', open: false };
                const key        = normKey;

                // Reusable range button row — shows preset buttons + active custom ranges + De/Até input
                const RangeButtons = ({ presets }: { presets: Array<{ label: string; from: number; to: number }> }) => {
                  const customActive = activeRanges.filter(
                    r => r.key === key && !presets.some(p => p.from === r.from && p.to === r.to)
                  );
                  return (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {/* De/Até always first */}
                        <button onClick={() => setCustomRange(p => ({ ...p, [key]: { ...cr, open: !cr.open } }))}
                          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                            cr.open ? 'bg-secondary border-secondary-foreground/20'
                                    : 'bg-background border-input hover:border-primary/50 hover:bg-accent'
                          )}>
                          De / Até
                        </button>
                        {/* Active custom ranges */}
                        {customActive.map(r => (
                          <button key={`${r.from}-${r.to}`} onClick={() => toggleRange(r)}
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground border-primary shadow-sm transition-all">
                            {r.label} <X className="h-2.5 w-2.5 ml-0.5" />
                          </button>
                        ))}
                        {presets.map(d => {
                          const active = activeRanges.some(r => r.key === key && r.from === d.from && r.to === d.to);
                          return (
                            <button key={d.label} onClick={() => toggleRange({ key, ...d })}
                              className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                                active ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                       : 'bg-background border-input hover:border-primary/50 hover:bg-accent'
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
                    ) : isNumeric ? (
                      // Auto-detected numeric field: smart intervals + De/Até
                      <RangeButtons presets={autoRanges(values)} />
                    ) : values.length > TEXT_MAX_CHIPS ? (
                      // Many text values: searchable chip list
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
                              const tag    = `${displayKey}::${value}`;
                              const active = activeTags.has(normTag(displayKey, value));
                              return (
                                <button key={tag} onClick={() => toggleTag(tag)}
                                  className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                                    active ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                           : 'bg-background border-input hover:border-primary/50 hover:bg-accent'
                                  )}>
                                  {value}{active && <X className="h-2.5 w-2.5 ml-0.5" />}
                                </button>
                              );
                            })}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{values.length} valores únicos</p>
                      </div>
                    ) : (
                      // Few text values: regular chips
                      <div className="flex flex-wrap gap-1.5">
                        {values.map(value => {
                          const tag    = `${displayKey}::${value}`;
                          const active = activeTags.has(normTag(displayKey, value));
                          return (
                            <button key={tag} onClick={() => toggleTag(tag)}
                              className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                                active ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                       : 'bg-background border-input hover:border-primary/50 hover:bg-accent'
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
          )}

          {/* Active filter chips (panel closed) */}
          {!showFilters && hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">Filtrando:</span>
              {Array.from(activeTags).map(normTagStr => {
                // resolve display form from allTags (normalized → display)
                const display = allTags.find(t => {
                  const { key, value } = tagLabel(t);
                  return normTag(key, value) === normTagStr;
                });
                const { key, value } = display ? tagLabel(display) : tagLabel(normTagStr);
                return (
                  <button key={normTagStr}
                    onClick={() => setActiveTags(prev => { const n = new Set(prev); n.delete(normTagStr); return n; })}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium hover:bg-primary/20 transition-colors">
                    <span className="opacity-70">{key}:</span>
                    <span>{value}</span>
                    <X className="h-2.5 w-2.5 ml-0.5" />
                  </button>
                );
              })}
              {activeRanges.map(r => (
                <button key={`${r.key}-${r.from}-${r.to}`} onClick={() => toggleRange(r)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium hover:bg-primary/20 transition-colors">
                  <span className="opacity-70">{r.key}:</span>
                  <span>{r.label}</span>
                  <X className="h-2.5 w-2.5 ml-0.5" />
                </button>
              ))}
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
                limpar tudo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {loadingItems ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title="Nenhum item ainda"
          description="Adicione itens manualmente ou importe um arquivo CSV/JSON."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1.5" />Importar
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />Adicionar
              </Button>
            </div>
          }
        />
      ) : processed.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">Nenhum resultado para os filtros atuais.</p>
          <button onClick={clearFilters} className="text-sm text-primary hover:underline">Limpar filtros</button>
        </div>
      ) : viewMode === 'list' ? (
        /* List view */
        <div className="divide-y border rounded-lg overflow-hidden bg-card">
          {processed.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
            >
              {item.photo_url ? (
                <img src={item.photo_url} alt={item.title} className="h-12 w-12 rounded-md object-cover border shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate group-hover:text-primary transition-colors">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                )}
                {Object.keys(item.attributes ?? {}).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {sortedAttrs(item, normalizedSchema).slice(0, 3).map(([k, v]) => {
                      const display = normalizedSchema[normalize(k)]?.type === 'duration'
                        ? formatDuration(parseInt(v)) || v : v;
                      return <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{display}</span>;
                    })}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                {formatDate(item.created_at)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {processed.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group rounded-lg border bg-card overflow-hidden text-left hover:shadow-md hover:border-primary/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <div className="p-2.5">
                <p className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                {Object.keys(item.attributes ?? {}).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sortedAttrs(item, normalizedSchema).slice(0, 3).map(([k, v]) => {
                      const display = normalizedSchema[normalize(k)]?.type === 'duration'
                        ? formatDuration(parseInt(v)) || v
                        : v;
                      return <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground leading-tight">{display}</span>;
                    })}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add item dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar item</DialogTitle>
          </DialogHeader>
          <ItemForm
            onSubmit={(vals) => addMutation.mutateAsync(vals)}
            onCancel={() => setAddOpen(false)}
            loading={addMutation.isPending}
            attributeSchema={attributeSchema}
            autocompleteValues={autocompleteValues}
            attributeKeyDisplays={attributeKeyDisplays}
          />
        </DialogContent>
      </Dialog>

      {/* Item detail/edit dialog */}
      <ItemDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(v) => !v && setSelectedItem(null)}
        attributeSchema={attributeSchema}
        autocompleteValues={autocompleteValues}
        attributeKeyDisplays={attributeKeyDisplays}
      />

      {/* Import dialog */}
      <ImportDialog
        collectionId={id!}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}
