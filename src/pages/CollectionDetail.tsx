import { useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Upload, Package,
  LayoutGrid, LayoutList, ArrowUpAZ, ArrowDownAZ,
  CalendarArrowUp, CalendarArrowDown, SlidersHorizontal, Library,
  Download, Globe, Lock, Share2, Search, MoreVertical,
  Check, Trash2, X,
} from 'lucide-react';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ItemDialog } from '../components/ItemDialog';
import { ItemForm } from '../components/ItemForm';
import { ImportDialog } from '../components/ImportDialog';
import { SearchDialog } from '../components/SearchDialog';
import { EmptyState } from '../components/EmptyState';
import { ItemFilterPanel } from '../components/ItemFilterPanel';
import { cn } from '../lib/utils';
import type { CollectionItem, AttributeSchema } from '../types';
import { formatDate, normalize, sortedAttrs } from '../lib/utils';
import { exportCollection } from '../lib/export';
import { formatDuration } from '../components/AttributeInput';
import { toast } from 'sonner';
import {
  type SortKey, type RangeFilter,
  sortItems, normTag, tagLabel, collectTags,
  itemMatchesTags, itemMatchesRanges,
} from '../lib/itemFilters';

type ViewMode = 'list' | 'grid';

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: 'date-desc', label: 'Mais recentes', icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: 'date-asc',  label: 'Mais antigos',  icon: <CalendarArrowUp   className="h-3.5 w-3.5" /> },
  { value: 'title-asc', label: 'A → Z',         icon: <ArrowUpAZ         className="h-3.5 w-3.5" /> },
  { value: 'title-desc',label: 'Z → A',         icon: <ArrowDownAZ       className="h-3.5 w-3.5" /> },
];

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

  const [searchOpen, setSearchOpen]         = useState(false);
  const [viewMode, setViewMode]             = usePersistedViewMode(id);
  const [sortBy, setSortBy]                 = useState<SortKey>('date-desc');
  const [activeTags, setActiveTags]         = useState<Set<string>>(new Set());
  const [activeRanges, setActiveRanges]     = useState<RangeFilter[]>([]);
  const [showFilters, setShowFilters]       = useState(false);
  const [selectedItem, setSelectedItem]     = useState<CollectionItem | null>(null);
  const [addOpen, setAddOpen]               = useState(false);
  const [importOpen, setImportOpen]         = useState(false);
  const [menuOpen, setMenuOpen]             = useState(false);
  const [sharingLink, setSharingLink]       = useState(false);
  const [selectMode, setSelectMode]         = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [shelfMenuOpen, setShelfMenuOpen]   = useState(false);
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);

  const longPressTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressDidFire  = useRef(false);

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

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves', id],
    queryFn: () => data.listShelves(id!),
    enabled: !!id && selectMode,
  });

  const togglePublicMutation = useMutation({
    mutationFn: () => data.updateCollection(id!, { is_public: !collection?.is_public }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['collection', id] });
      toast.success(updated.is_public ? 'Coleção agora é pública.' : 'Coleção agora é privada.');
    },
    onError: (e: Error) => toast.error(e.message),
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

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const itemId of ids) await data.deleteItem(itemId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', id] });
      qc.invalidateQueries({ queryKey: ['activities', user?.id] });
      exitSelectMode();
      toast.success('Itens removidos.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batchMoveMutation = useMutation({
    mutationFn: async ({ ids, shelfId }: { ids: string[]; shelfId: string }) => {
      for (const itemId of ids) await data.updateItem(itemId, { shelf_id: shelfId, shelf_row: null, shelf_col: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', id] });
      exitSelectMode();
      toast.success('Itens adicionados à estante.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasTags = useMemo(() => collectTags(items).length > 0, [items]);

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
    const afterTags   = items.filter(item => itemMatchesTags(item, activeTags));
    const afterRanges = afterTags.filter(item => itemMatchesRanges(item, activeRanges));
    return sortItems(afterRanges, sortBy);
  }, [items, activeTags, activeRanges, sortBy]);

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

  function clearFilters() {
    setActiveTags(new Set());
    setActiveRanges([]);
  }

  function toggleSelect(itemId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBatchConfirmDelete(false);
    setShelfMenuOpen(false);
  }

  function startLongPress(item: CollectionItem) {
    if (selectMode) return;
    longPressDidFire.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressDidFire.current = true;
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  const hasActiveFilters = activeTags.size > 0 || activeRanges.length > 0;
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
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <Button
            variant="outline"
            size="icon"
            title={collection?.is_public ? 'Tornar privada' : 'Tornar pública'}
            onClick={() => togglePublicMutation.mutate()}
            disabled={togglePublicMutation.isPending}
          >
            {collection?.is_public
              ? <Globe className="h-4 w-4 text-green-600" />
              : <Lock className="h-4 w-4" />
            }
          </Button>
          {collection?.is_public && (
            <Button
              variant="outline"
              size="icon"
              title="Copiar link público"
              disabled={sharingLink}
              onClick={async () => {
                const url = `${window.location.origin}/p/${id}`;
                setSharingLink(true);
                try {
                  const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
                  const short = await res.text();
                  await navigator.clipboard.writeText(short.trim());
                  toast.success('Link encurtado copiado!');
                } catch {
                  await navigator.clipboard.writeText(url);
                  toast.success('Link copiado!');
                } finally {
                  setSharingLink(false);
                }
              }}
            >
              {sharingLink
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Share2 className="h-4 w-4" />
              }
            </Button>
          )}
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Importar
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => exportCollection(collection!, items)}>
            <Download className="h-4 w-4 mr-1.5" />
            Baixar
          </Button>
          {/* Mobile options menu */}
          <div className="relative sm:hidden">
            <Button
              variant="outline"
              size="icon"
              title="Mais opções"
              onClick={() => setMenuOpen(v => !v)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-36 rounded-md border bg-popover shadow-md py-1">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => { setImportOpen(true); setMenuOpen(false); }}
                  >
                    <Upload className="h-4 w-4" />
                    Importar
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => { exportCollection(collection!, items); setMenuOpen(false); }}
                  >
                    <Download className="h-4 w-4" />
                    Baixar
                  </button>
                </div>
              </>
            )}
          </div>
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
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Buscar itens...</span>
            </button>

            {/* Filter toggle */}
            {hasTags && (
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

            {/* Sort — cycles through options on click */}
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

            {/* View toggle + shelf */}
            <div className="flex shrink-0 h-9 rounded-md border border-input overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center justify-center w-9 h-full transition-colors',
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
                  'flex items-center justify-center w-9 h-full transition-colors border-l border-input',
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent text-muted-foreground'
                )}
                title="Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <Link
                to={`/collections/${id}/shelves`}
                className="flex items-center justify-center w-9 h-full transition-colors border-l border-input bg-background hover:bg-accent text-muted-foreground"
                title="Estantes"
              >
                <Library className="h-4 w-4" />
              </Link>
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
              onClick={() => {
                if (longPressDidFire.current) { longPressDidFire.current = false; return; }
                selectMode ? toggleSelect(item.id) : setSelectedItem(item);
              }}
              onMouseDown={() => startLongPress(item)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(item)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 transition-colors text-left group',
                selectMode && selectedIds.has(item.id) ? 'bg-primary/5' : 'hover:bg-accent/50',
              )}
            >
              {selectMode && (
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  selectedIds.has(item.id) ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                )}>
                  {selectedIds.has(item.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              )}
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
              onClick={() => {
                if (longPressDidFire.current) { longPressDidFire.current = false; return; }
                selectMode ? toggleSelect(item.id) : setSelectedItem(item);
              }}
              onMouseDown={() => startLongPress(item)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(item)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                'group rounded-lg border overflow-hidden text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectMode && selectedIds.has(item.id)
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'bg-card hover:shadow-md hover:border-primary/30',
              )}
            >
              <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {selectMode && (
                  <div className={cn(
                    'absolute top-2 right-2 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all',
                    selectedIds.has(item.id) ? 'border-primary bg-primary' : 'border-white/80 bg-black/20',
                  )}>
                    {selectedIds.has(item.id) && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                )}
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
            enableOmdb
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

      {/* Search dialog */}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        items={items}
        attributeSchema={attributeSchema}
        onSelect={(item) => setSelectedItem(item)}
      />

      {/* Import dialog */}
      <ImportDialog
        collectionId={id!}
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      {/* Batch action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border bg-popover shadow-xl px-4 py-2.5 whitespace-nowrap">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSelectedIds(new Set(processed.map(i => i.id)))}
          >
            Todos
          </button>

          {/* Move to shelf */}
          <div className="relative">
            <button
              onClick={() => { setShelfMenuOpen(v => !v); setBatchConfirmDelete(false); }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
              disabled={batchMoveMutation.isPending}
            >
              <Library className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Estante</span>
            </button>
            {shelfMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShelfMenuOpen(false)} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-40 rounded-md border bg-popover shadow-md py-1">
                  {shelves.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma estante</p>
                  ) : shelves.map(shelf => (
                    <button
                      key={shelf.id}
                      className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent transition-colors text-left disabled:opacity-50"
                      onClick={() => batchMoveMutation.mutate({ ids: Array.from(selectedIds), shelfId: shelf.id })}
                      disabled={batchMoveMutation.isPending}
                    >
                      {shelf.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          {batchConfirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive font-medium">
                Remover {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'itens'}?
              </span>
              <button
                className="rounded-md px-2.5 py-1.5 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                onClick={() => batchDeleteMutation.mutate(Array.from(selectedIds))}
                disabled={batchDeleteMutation.isPending}
              >
                {batchDeleteMutation.isPending ? 'Removendo...' : 'Confirmar'}
              </button>
              <button
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setBatchConfirmDelete(false)}
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setBatchConfirmDelete(true); setShelfMenuOpen(false); }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Remover</span>
            </button>
          )}

          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={exitSelectMode} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
