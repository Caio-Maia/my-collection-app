import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Upload, Package,
  LayoutGrid, LayoutList, ArrowUpAZ, ArrowDownAZ,
  CalendarArrowUp, CalendarArrowDown, SlidersHorizontal, Library,
  Download, Globe, Lock, Share2, Search,
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

  const [searchOpen, setSearchOpen]     = useState(false);
  const [viewMode, setViewMode]         = usePersistedViewMode(id);
  const [sortBy, setSortBy]             = useState<SortKey>('date-desc');
  const [activeTags, setActiveTags]     = useState<Set<string>>(new Set());
  const [activeRanges, setActiveRanges] = useState<RangeFilter[]>([]);
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
            title="Exportar coleção"
            onClick={() => exportCollection(collection!, items)}
          >
            <Download className="h-4 w-4" />
          </Button>
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
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/p/${id}`);
                toast.success('Link copiado!');
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
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

            {/* Shelf view link */}
            <Link to={`/collections/${id}/shelves`} className="shrink-0">
              <Button variant="outline" size="icon" title="Estantes">
                <Library className="h-4 w-4" />
              </Button>
            </Link>
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
    </div>
  );
}
