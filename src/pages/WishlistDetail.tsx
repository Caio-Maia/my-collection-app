import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, MoreVertical, Pencil, Trash2,
  LayoutGrid, LayoutList, ArrowUpAZ, ArrowDownAZ,
  CalendarArrowUp, CalendarArrowDown, Globe, Lock,
  Share2, ShoppingBag, Heart, Search,
} from 'lucide-react';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { ItemForm } from '../components/ItemForm';
import { SearchDialog } from '../components/SearchDialog';
import { EmptyState } from '../components/EmptyState';
import type { CollectionItem, WishlistItem } from '../types';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

type SortKey = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: 'date-desc', label: 'Mais recentes', icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: 'date-asc',  label: 'Mais antigos',  icon: <CalendarArrowUp   className="h-3.5 w-3.5" /> },
  { value: 'title-asc', label: 'A → Z',         icon: <ArrowUpAZ         className="h-3.5 w-3.5" /> },
  { value: 'title-desc',label: 'Z → A',         icon: <ArrowDownAZ       className="h-3.5 w-3.5" /> },
];

function CollectionSelect({
  value,
  onChange,
  collections,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  collections: { id: string; name: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <option value="">{placeholder ?? 'Nenhuma'}</option>
      {collections.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

function toFakeCollectionItem(w: WishlistItem): CollectionItem {
  return {
    id: w.id,
    collection_id: '',
    title: w.title,
    description: w.description,
    photo_url: w.photo_url,
    attributes: w.attributes,
    shelf_id: null,
    shelf_row: null,
    shelf_col: null,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const stored = localStorage.getItem(`wishlist-view-${id}`);
    return stored === 'grid' ? 'grid' : 'list';
  });
  const setView = (v: 'list' | 'grid') => {
    if (id) localStorage.setItem(`wishlist-view-${id}`, v);
    setViewMode(v);
  };

  const [sortBy, setSortBy] = useState<SortKey>('date-desc');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addTargetColId, setAddTargetColId] = useState('');

  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [editTargetColId, setEditTargetColId] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<WishlistItem | null>(null);

  const [acquireItem, setAcquireItem] = useState<WishlistItem | null>(null);
  const [acquireColId, setAcquireColId] = useState('');

  const [editWishlistOpen, setEditWishlistOpen] = useState(false);
  const [wlName, setWlName] = useState('');
  const [wlDesc, setWlDesc] = useState('');
  const [wlPublic, setWlPublic] = useState(false);

  const { data: wishlist, isLoading: loadingWl } = useQuery({
    queryKey: ['wishlist', id],
    queryFn: () => data.getWishlist(id!),
    enabled: !!id,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['wishlistItems', id],
    queryFn: () => data.listWishlistItems(id!),
    enabled: !!id,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => data.listCollections(user!.id),
    enabled: !!user,
  });

  const getCollection = (colId: string | null) =>
    colId ? (collections.find((c) => c.id === colId) ?? null) : null;

  const getCollectionName = (colId: string | null) =>
    getCollection(colId)?.name ?? (colId ? 'Coleção removida' : null);

  const isFilmCollection = (colId: string) =>
    getCollection(colId)?.collection_type === 'film';

  const processed = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'date-desc') return b.created_at.localeCompare(a.created_at);
      if (sortBy === 'date-asc')  return a.created_at.localeCompare(b.created_at);
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      return b.title.localeCompare(a.title);
    });
  }, [items, sortBy]);

  const addMutation = useMutation({
    mutationFn: (vals: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>) =>
      data.createWishlistItem(id!, user!.id, {
        target_collection_id: addTargetColId || null,
        title: vals.title,
        description: vals.description,
        photo_url: vals.photo_url,
        attributes: vals.attributes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlistItems', id] });
      qc.invalidateQueries({ queryKey: ['wishlist-all', user?.id] });
      setAddOpen(false);
      setAddTargetColId('');
      toast.success('Item adicionado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: (vals: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>) =>
      data.updateWishlistItem(editItem!.id, {
        target_collection_id: editTargetColId || null,
        title: vals.title,
        description: vals.description,
        photo_url: vals.photo_url,
        attributes: vals.attributes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlistItems', id] });
      qc.invalidateQueries({ queryKey: ['wishlist-all', user?.id] });
      setEditItem(null);
      toast.success('Item atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => data.deleteWishlistItem(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlistItems', id] });
      qc.invalidateQueries({ queryKey: ['wishlist-all', user?.id] });
      setDeleteTarget(null);
      toast.success('Item removido.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acquireMutation = useMutation({
    mutationFn: () =>
      data.moveWishlistItemToCollection(acquireItem!.id, acquireColId, user!.id),
    onSuccess: (_, __, ___) => {
      qc.invalidateQueries({ queryKey: ['wishlistItems', id] });
      qc.invalidateQueries({ queryKey: ['wishlist-all', user?.id] });
      qc.invalidateQueries({ queryKey: ['items', acquireColId] });
      qc.invalidateQueries({ queryKey: ['activities', user?.id] });
      setAcquireItem(null);
      setAcquireColId('');
      toast.success('Item movido para a coleção!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editWishlistMutation = useMutation({
    mutationFn: () =>
      data.updateWishlist(id!, { name: wlName.trim(), description: wlDesc.trim(), is_public: wlPublic }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist', id] });
      qc.invalidateQueries({ queryKey: ['wishlists', user?.id] });
      setEditWishlistOpen(false);
      toast.success('Lista atualizada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEditWishlist = () => {
    setWlName(wishlist?.name ?? '');
    setWlDesc(wishlist?.description ?? '');
    setWlPublic(wishlist?.is_public ?? false);
    setEditWishlistOpen(true);
  };

  const openEditItem = (item: WishlistItem) => {
    setEditItem(item);
    setEditTargetColId(item.target_collection_id ?? '');
  };

  const openAcquire = (item: WishlistItem) => {
    setAcquireItem(item);
    setAcquireColId(item.target_collection_id ?? '');
  };

  const shareLink = () => {
    const url = `${window.location.origin}/pw/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy)!;

  if (loadingWl) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-10 text-center">
        <p className="text-muted-foreground">Lista não encontrada.</p>
        <Link to="/wishlists" className="mt-4 inline-block text-sm text-primary hover:underline">
          Voltar para listas
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/wishlists"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Listas de desejos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{wishlist.name}</h1>
              {wishlist.is_public ? (
                <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  <Globe className="h-3 w-3" /> Pública
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  <Lock className="h-3 w-3" /> Privada
                </span>
              )}
            </div>
            {wishlist.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{wishlist.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {wishlist.is_public && (
              <Button variant="outline" size="sm" onClick={shareLink}>
                <Share2 className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Compartilhar</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openEditWishlist}>
              <Pencil className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Editar lista</span>
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 w-full sm:flex-1 sm:w-auto rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Buscar itens...</span>
          </button>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background shrink-0 hover:bg-accent transition-colors text-muted-foreground"
              title={currentSort.label}
            >
              {currentSort.icon}
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-36 rounded-md border bg-popover shadow-md py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                        sortBy === opt.value && 'bg-accent',
                      )}
                      onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View toggle — ml-auto pushes to row-2 right on mobile */}
          <div className="flex ml-auto sm:ml-0 shrink-0 h-9 rounded-md border border-input overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={cn(
                'w-9 h-full flex items-center justify-center transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-muted-foreground',
              )}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn(
                'w-9 h-full flex items-center justify-center transition-colors border-l border-input',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-muted-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loadingItems ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-10 w-10" />}
          title="Nenhum item nesta lista"
          description="Adicione itens que você deseja adquirir."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar item
            </Button>
          }
        />
      ) : viewMode === 'list' ? (
        <div className="divide-y rounded-lg border">
          {processed.map((item) => (
            <WishlistItemRow
              key={item.id}
              item={item}
              collectionName={getCollectionName(item.target_collection_id)}
              onOpen={() => setSelectedItem(item)}
              onEdit={() => openEditItem(item)}
              onDelete={() => setDeleteTarget(item)}
              onAcquire={() => openAcquire(item)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {processed.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              collectionName={getCollectionName(item.target_collection_id)}
              onOpen={() => setSelectedItem(item)}
              onEdit={() => openEditItem(item)}
              onDelete={() => setDeleteTarget(item)}
              onAcquire={() => openAcquire(item)}
            />
          ))}
        </div>
      )}

      {/* Add item dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) { setAddOpen(false); setAddTargetColId(''); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar item</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 mb-2">
            <label className="text-sm font-medium">Coleção alvo (define o tipo para sugestões)</label>
            <CollectionSelect
              value={addTargetColId}
              onChange={setAddTargetColId}
              collections={collections}
              placeholder="Sem coleção alvo"
            />
          </div>
          <ItemForm
            onSubmit={(vals) => addMutation.mutateAsync(vals)}
            onCancel={() => { setAddOpen(false); setAddTargetColId(''); }}
            loading={addMutation.isPending}
            enableOmdb={isFilmCollection(addTargetColId)}
            attributeSchema={getCollection(addTargetColId)?.attribute_schema ?? {}}
          />
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          {editItem && (
            <>
              <div className="space-y-1.5 mb-2">
                <label className="text-sm font-medium">Coleção alvo</label>
                <CollectionSelect
                  value={editTargetColId}
                  onChange={setEditTargetColId}
                  collections={collections}
                  placeholder="Sem coleção alvo"
                />
              </div>
              <ItemForm
                initial={toFakeCollectionItem(editItem)}
                onSubmit={(vals) => editMutation.mutateAsync(vals)}
                onCancel={() => setEditItem(null)}
                loading={editMutation.isPending}
                enableOmdb={isFilmCollection(editTargetColId)}
                attributeSchema={getCollection(editTargetColId)?.attribute_schema ?? {}}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover item</DialogTitle>
            <DialogDescription>
              Tem certeza que quer remover <strong>{deleteTarget?.title}</strong> da lista de desejos?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acquire dialog */}
      <Dialog open={!!acquireItem} onOpenChange={(v) => !v && setAcquireItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mover para coleção</DialogTitle>
            <DialogDescription>
              Selecione a coleção para onde <strong>{acquireItem?.title}</strong> será adicionado.
            </DialogDescription>
          </DialogHeader>
          <CollectionSelect
            value={acquireColId}
            onChange={setAcquireColId}
            collections={collections}
            placeholder="Selecione uma coleção..."
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcquireItem(null)}>Cancelar</Button>
            <Button
              onClick={() => acquireMutation.mutate()}
              disabled={acquireMutation.isPending || !acquireColId}
            >
              {acquireMutation.isPending ? 'Movendo...' : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(v) => !v && setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selectedItem.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Adicionado em {formatDate(selectedItem.created_at)}
                  {getCollectionName(selectedItem.target_collection_id) && (
                    <> · <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">
                      {getCollectionName(selectedItem.target_collection_id)}
                    </Badge></>
                  )}
                </DialogDescription>
              </DialogHeader>

              {selectedItem.photo_url && (
                <img
                  src={selectedItem.photo_url}
                  alt={selectedItem.title}
                  className="w-full h-56 object-cover rounded-md border"
                  referrerPolicy="no-referrer"
                />
              )}

              {selectedItem.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedItem.description}</p>
              )}

              {Object.entries(selectedItem.attributes).filter(([k]) => k.trim()).length > 0 && (
                <>
                  <Separator />
                  <dl className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedItem.attributes).filter(([k]) => k.trim()).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</dt>
                        <dd className="text-sm mt-0.5">
                          <Badge variant="secondary">{value}</Badge>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDeleteTarget(selectedItem); setSelectedItem(null); }}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Remover
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { openEditItem(selectedItem); setSelectedItem(null); }}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => { openAcquire(selectedItem); setSelectedItem(null); }}
                >
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Adquirir
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit wishlist settings */}
      <Dialog open={editWishlistOpen} onOpenChange={setEditWishlistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar lista</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); editWishlistMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <Input value={wlName} onChange={(e) => setWlName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição</label>
              <Input value={wlDesc} onChange={(e) => setWlDesc(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wl-public"
                checked={wlPublic}
                onChange={(e) => setWlPublic(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor="wl-public" className="text-sm cursor-pointer">
                Lista pública
              </label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditWishlistOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editWishlistMutation.isPending || !wlName.trim()}>
                {editWishlistMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        items={items.map(toFakeCollectionItem)}
        attributeSchema={{}}
        onSelect={(fake) => {
          const found = items.find((i) => i.id === fake.id) ?? null;
          if (found) setSelectedItem(found);
        }}
      />
    </div>
  );
}

function ItemActions({
  onEdit,
  onAcquire,
  onDelete,
}: {
  onEdit: () => void;
  onAcquire: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAcquire}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Adquirir / Mover para coleção
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WishlistItemRow({
  item,
  collectionName,
  onOpen,
  onEdit,
  onDelete,
  onAcquire,
}: {
  item: WishlistItem;
  collectionName: string | null;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAcquire: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer" onClick={onOpen}>
      {item.photo_url ? (
        <img
          src={item.photo_url}
          alt=""
          className="h-12 w-12 rounded-md object-cover shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Heart className="h-5 w-5 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {collectionName && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {collectionName}
            </span>
          )}
          {Object.entries(item.attributes).slice(0, 2).map(([k, v]) => (
            <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {v}
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(item.created_at)}</span>
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ItemActions onEdit={onEdit} onAcquire={onAcquire} onDelete={onDelete} />
      </div>
    </div>
  );
}

function WishlistItemCard({
  item,
  collectionName,
  onOpen,
  onEdit,
  onDelete,
  onAcquire,
}: {
  item: WishlistItem;
  collectionName: string | null;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAcquire: () => void;
}) {
  return (
    <div className="group relative rounded-lg border bg-card hover:shadow-md transition-shadow overflow-hidden cursor-pointer" onClick={onOpen}>
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Heart className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-1 right-1" onClick={(e) => e.stopPropagation()}>
          <ItemActions onEdit={onEdit} onAcquire={onAcquire} onDelete={onDelete} />
        </div>
      </div>
      <div className="p-2.5">
        <p className="font-medium text-sm line-clamp-1">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {collectionName && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {collectionName}
            </span>
          )}
          {Object.entries(item.attributes).slice(0, 2).map(([k, v]) => (
            <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
