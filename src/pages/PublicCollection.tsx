import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package, LayoutGrid, LayoutList, Lock, Search,
  SlidersHorizontal, ArrowUpAZ, ArrowDownAZ, CalendarArrowUp, CalendarArrowDown,
} from 'lucide-react';
import { getPublicCollection, listPublicItems } from '../data/public';
import { ItemDialog } from '../components/ItemDialog';
import { ItemFilterPanel } from '../components/ItemFilterPanel';
import { SearchDialog } from '../components/SearchDialog';
import { cn, normalize, sortedAttrs } from '../lib/utils';
import { formatDuration } from '../components/AttributeInput';
import {
  type SortKey, type RangeFilter,
  sortItems, normTag, tagLabel, collectTags,
  itemMatchesTags, itemMatchesRanges,
} from '../lib/itemFilters';
import type { CollectionItem, AttributeSchema } from '../types';

type ViewMode = 'list' | 'grid';

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: 'date-desc', label: 'Mais recentes', icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: 'date-asc',  label: 'Mais antigos',  icon: <CalendarArrowUp   className="h-3.5 w-3.5" /> },
  { value: 'title-asc', label: 'A → Z',         icon: <ArrowUpAZ         className="h-3.5 w-3.5" /> },
  { value: 'title-desc',label: 'Z → A',         icon: <ArrowDownAZ       className="h-3.5 w-3.5" /> },
];

export function PublicCollection() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortKey>('date-desc');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activeRanges, setActiveRanges] = useState<RangeFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  const { data: collection, isLoading: loadingCol } = useQuery({
    queryKey: ['public-collection', id],
    queryFn: () => getPublicCollection(id!),
    enabled: !!id,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['public-items', id],
    queryFn: () => listPublicItems(id!),
    enabled: !!id,
  });

  const attributeSchema = (collection?.attribute_schema ?? {}) as AttributeSchema;

  const normalizedSchema = useMemo(() => {
    const result: AttributeSchema = {};
    Object.entries(attributeSchema).forEach(([k, v]) => { result[normalize(k)] = v; });
    return result;
  }, [attributeSchema]);

  const hasTags = useMemo(() => collectTags(items).length > 0, [items]);
  const hasActiveFilters = activeTags.size > 0 || activeRanges.length > 0;

  const processed = useMemo(() => {
    const afterTags   = items.filter(item => itemMatchesTags(item, activeTags));
    const afterRanges = afterTags.filter(item => itemMatchesRanges(item, activeRanges));
    return sortItems(afterRanges, sortBy);
  }, [items, activeTags, activeRanges, sortBy]);

  function toggleTag(tag: string) {
    const { key, value } = tagLabel(tag);
    const norm = normTag(key, value);
    setActiveTags(prev => {
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

  function clearFilters() {
    setActiveTags(new Set());
    setActiveRanges([]);
  }

  const currentSort = SORT_OPTIONS.find(o => o.value === sortBy)!;

  if (loadingCol) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold">Coleção não encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Esta coleção é privada ou não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{collection.name}</h1>
            {collection.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{collection.description}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {hasActiveFilters && processed.length !== items.length && (
              <span className="text-primary font-medium"> · {processed.length} visíveis</span>
            )}
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-6 space-y-4">
        {/* Toolbar */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 h-9 w-full sm:flex-1 sm:w-auto rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">Buscar itens...</span>
              </button>

              {/* Filter toggle */}
              {hasTags && (
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={cn(
                    'relative flex items-center justify-center h-9 w-9 rounded-md border shrink-0 transition-colors',
                    showFilters || hasActiveFilters
                      ? 'bg-secondary border-secondary-foreground/20'
                      : 'bg-background border-input hover:bg-accent text-muted-foreground',
                  )}
                  title="Filtros"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeTags.size > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                      {activeTags.size}
                    </span>
                  )}
                </button>
              )}

              {/* Sort — cycles on click */}
              <button
                onClick={() => {
                  const idx = SORT_OPTIONS.findIndex(o => o.value === sortBy);
                  setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
                }}
                className="flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background shrink-0 hover:bg-accent transition-colors text-muted-foreground"
                title={currentSort.label}
              >
                {currentSort.icon}
              </button>

              {/* View toggle — ml-auto pushes to row-2 right on mobile */}
              <div className="flex ml-auto sm:ml-0 shrink-0 h-9 rounded-md border border-input overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center justify-center w-9 h-full transition-colors',
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-muted-foreground',
                  )}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex items-center justify-center w-9 h-full transition-colors border-l border-input',
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-muted-foreground',
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            <ItemFilterPanel
              items={items}
              normalizedSchema={normalizedSchema}
              activeTags={activeTags}
              onToggleTag={toggleTag}
              activeRanges={activeRanges}
              onToggleRange={toggleRange}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              showFilters={showFilters}
            />
          </div>
        )}

        {/* Items */}
        {loadingItems ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : processed.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-muted-foreground">
            <p>{hasActiveFilters ? 'Nenhum resultado para os filtros atuais.' : 'Nenhum item nesta coleção.'}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-primary hover:underline">Limpar filtros</button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y border rounded-lg overflow-hidden bg-card">
            {processed.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
              >
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.title} className="h-12 w-12 rounded-md object-cover border shrink-0" referrerPolicy="no-referrer" />
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
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {processed.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group rounded-lg border bg-card overflow-hidden text-left hover:shadow-md hover:border-primary/30 transition-all duration-200"
              >
                <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                  {Object.keys(item.attributes ?? {}).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sortedAttrs(item, normalizedSchema).slice(0, 3).map(([k, v]) => {
                        const display = normalizedSchema[normalize(k)]?.type === 'duration'
                          ? formatDuration(parseInt(v)) || v : v;
                        return <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground leading-tight">{display}</span>;
                      })}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        items={items}
        attributeSchema={attributeSchema}
        onSelect={item => setSelectedItem(item)}
      />

      <ItemDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={v => !v && setSelectedItem(null)}
        attributeSchema={attributeSchema}
        readonly
      />
    </div>
  );
}
