import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Library, Pencil, Trash2, Search, X, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ItemDialog } from '../components/ItemDialog';
import { ShelfFormDialog } from '../components/shelf/ShelfFormDialog';
import { ShelfGrid } from '../components/shelf/ShelfGrid';
import { UnplacedTray } from '../components/shelf/UnplacedTray';
import { normalize } from '../lib/utils';
import type { CollectionItem, AttributeSchema, Shelf } from '../types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function Shelves() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  useAuth();
  const qc = useQueryClient();

  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [deleteShelf, setDeleteShelf] = useState<Shelf | null>(null);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [search, setSearch] = useState('');

  // Touch drag state — only touchDragItem and touchDragOverCell in React state;
  // ghost position is updated imperatively to avoid re-renders on every touchmove.
  const [touchDragItem, setTouchDragItem]         = useState<CollectionItem | null>(null);
  const [touchDragOverCell, setTouchDragOverCell] = useState<{ row: number; col: number } | null>(null);
  // Initial ghost position — set once when a drag starts (not per move).
  const [ghostStart, setGhostStart]               = useState<{ x: number; y: number } | null>(null);

  const touchDragItemRef     = useRef<CollectionItem | null>(null);
  const touchDragOverCellRef = useRef<{ row: number; col: number } | null>(null);
  const ghostRef             = useRef<HTMLDivElement>(null);
  const scrollContainerRef   = useRef<HTMLDivElement>(null);
  const scrollRafRef         = useRef<number | null>(null);
  const scrollSpeedRef       = useRef<number>(0);
  const handleDropRef        = useRef<(itemId: string, row: number, col: number) => void>(() => {});

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

  const { data: shelves = [], isLoading: loadingShelves } = useQuery({
    queryKey: ['shelves', id],
    queryFn: () => data.listShelves(id!),
    enabled: !!id,
  });

  const activeShelf = shelves.find(s => s.id === activeShelfId) ?? shelves[0] ?? null;

  const attributeSchema = (collection?.attribute_schema ?? {}) as AttributeSchema;

  const unplacedItems = useMemo(
    () => items.filter(i => i.shelf_id === null || !shelves.some(s => s.id === i.shelf_id)),
    [items, shelves],
  );

  const searchMatch = useMemo(() => {
    if (!search.trim() || !activeShelf) return null;
    const q = normalize(search);
    return items.find(
      i =>
        i.shelf_id === activeShelf.id &&
        (normalize(i.title).includes(q) ||
          normalize(i.description).includes(q) ||
          Object.values(i.attributes ?? {}).some(v => normalize(v).includes(q))),
    ) ?? null;
  }, [search, items, activeShelf]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['items', id] });
    qc.invalidateQueries({ queryKey: ['shelves', id] });
  }

  const createShelfMutation = useMutation({
    mutationFn: (vals: Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>) =>
      data.createShelf(id!, vals),
    onSuccess: (shelf) => {
      invalidate();
      setActiveShelfId(shelf.id);
      setFormOpen(false);
      toast.success('Estante criada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateShelfMutation = useMutation({
    mutationFn: (vals: Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>) =>
      data.updateShelf(editingShelf!.id, vals),
    onSuccess: () => {
      invalidate();
      setEditingShelf(null);
      toast.success('Estante atualizada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteShelfMutation = useMutation({
    mutationFn: () => data.deleteShelf(deleteShelf!.id),
    onSuccess: () => {
      invalidate();
      if (activeShelfId === deleteShelf?.id) setActiveShelfId(null);
      setDeleteShelf(null);
      toast.success('Estante removida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const placementMutation = useMutation({
    mutationFn: ({ itemId, shelfId, row, col }: {
      itemId: string; shelfId: string | null; row: number | null; col: number | null;
    }) => data.setItemPlacement(itemId, shelfId, row, col),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleDrop(itemId: string, row: number, col: number) {
    if (!activeShelf) return;
    placementMutation.mutate({ itemId, shelfId: activeShelf.id, row, col });
  }

  function handleUnplace(itemId: string) {
    placementMutation.mutate({ itemId, shelfId: null, row: null, col: null });
  }

  // Keep the drop handler ref current without assigning during render.
  useEffect(() => {
    handleDropRef.current = handleDrop;
  });

  function handleLongPressStart(item: CollectionItem, x: number, y: number) {
    setGhostStart({ x, y });
    touchDragItemRef.current = item;
    setTouchDragItem(item);
    setSelectedItem(null); // close ItemDialog if open
  }

  // Auto-scroll helpers
  function stopScrollLoop() {
    scrollSpeedRef.current = 0;
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }

  function startScrollLoop() {
    if (scrollRafRef.current !== null) return; // already running
    const loop = () => {
      const speed = scrollSpeedRef.current;
      if (!speed || !scrollContainerRef.current) {
        scrollRafRef.current = null;
        return;
      }
      scrollContainerRef.current.scrollLeft += speed;
      scrollRafRef.current = requestAnimationFrame(loop);
    };
    scrollRafRef.current = requestAnimationFrame(loop);
  }

  // Global touch handlers while a drag is active
  useEffect(() => {
    if (!touchDragItem) return;

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const touch = e.touches[0];
      const { clientX, clientY } = touch;

      // Move ghost imperatively — no setState, no re-render
      if (ghostRef.current) {
        ghostRef.current.style.left = `${clientX}px`;
        ghostRef.current.style.top  = `${clientY}px`;
      }

      // Auto-scroll when near the horizontal edges of the scroll container
      const container = scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const ZONE = 56;
        const rightDist = rect.right  - clientX;
        const leftDist  = clientX     - rect.left;

        if (rightDist < ZONE && rightDist > 0) {
          scrollSpeedRef.current = Math.ceil((1 - rightDist / ZONE) * 8);
          startScrollLoop();
        } else if (leftDist < ZONE && leftDist > 0) {
          scrollSpeedRef.current = -Math.ceil((1 - leftDist / ZONE) * 8);
          startScrollLoop();
        } else {
          stopScrollLoop();
        }
      }

      // Update highlighted cell only when it actually changes
      const els = document.elementsFromPoint(clientX, clientY);
      const cellEl = els.find(el => el.hasAttribute('data-cell-row'));
      if (cellEl) {
        const row = parseInt(cellEl.getAttribute('data-cell-row')!);
        const col = parseInt(cellEl.getAttribute('data-cell-col')!);
        const prev = touchDragOverCellRef.current;
        if (!prev || prev.row !== row || prev.col !== col) {
          touchDragOverCellRef.current = { row, col };
          setTouchDragOverCell({ row, col });
        }
      } else if (touchDragOverCellRef.current !== null) {
        touchDragOverCellRef.current = null;
        setTouchDragOverCell(null);
      }
    }

    function onTouchEnd() {
      stopScrollLoop();
      const item = touchDragItemRef.current;
      const cell = touchDragOverCellRef.current;
      if (item && cell) {
        handleDropRef.current(item.id, cell.row, cell.col);
      }
      touchDragItemRef.current     = null;
      touchDragOverCellRef.current = null;
      setTouchDragItem(null);
      setTouchDragOverCell(null);
      setGhostStart(null);
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      stopScrollLoop();
    };
  }, [touchDragItem]);

  const loading = loadingCol || loadingItems || loadingShelves;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/collections/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Library className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">
            Estantes{collection ? ` · ${collection.name}` : ''}
          </h1>
          <p className="text-xs text-muted-foreground">
            {shelves.length} estante{shelves.length !== 1 ? 's' : ''} · {items.length} iten{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Nova estante</span>
        </Button>
      </div>

      {shelves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
          <Library className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-muted-foreground">Nenhuma estante criada</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Crie uma estante para começar a organizar seus itens.
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova estante
          </Button>
        </div>
      ) : (
        <>
          {/* Shelf tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {shelves.map(shelf => (
              <button
                key={shelf.id}
                onClick={() => setActiveShelfId(shelf.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
                  activeShelf?.id === shelf.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-accent',
                )}
              >
                {shelf.name || `Estante ${shelves.indexOf(shelf) + 1}`}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {shelf.rows}×{shelf.cols}
                </span>
              </button>
            ))}
          </div>

          {activeShelf && (
            <>
              {/* Active shelf toolbar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item na estante..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
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
                <div className="ml-auto flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingShelf(activeShelf)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteShelf(activeShelf)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir
                  </Button>
                </div>
              </div>

              {search && searchMatch === null && (
                <p className="text-sm text-muted-foreground">
                  Nenhum item nesta estante corresponde a "{search}".
                </p>
              )}

              {/* Grid */}
              <ShelfGrid
                shelf={activeShelf}
                items={items}
                schema={attributeSchema}
                highlightItemId={searchMatch?.id}
                onDrop={handleDrop}
                onItemClick={setSelectedItem}
                onLongPressStart={handleLongPressStart}
                touchDragOverCell={touchDragOverCell}
                scrollRef={scrollContainerRef}
              />
              <p className="text-xs text-muted-foreground text-center">
                {activeShelf.rows} linhas × {activeShelf.cols} colunas
              </p>

              {/* Unplaced tray */}
              <UnplacedTray
                items={unplacedItems}
                schema={attributeSchema}
                onDrop={handleUnplace}
                onItemClick={setSelectedItem}
                onLongPressStart={handleLongPressStart}
              />
            </>
          )}
        </>
      )}

      {/* Touch drag ghost — positioned imperatively via ghostRef */}
      {touchDragItem && createPortal(
        <div
          ref={ghostRef}
          className="fixed z-[9999] pointer-events-none select-none"
          style={{
            left: ghostStart?.x ?? -9999,
            top:  ghostStart?.y ?? -9999,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex items-center gap-1.5 rounded-md border bg-card shadow-xl px-2 py-1.5 text-xs font-medium opacity-90 scale-110">
            {touchDragItem.photo_url ? (
              <img src={touchDragItem.photo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="max-w-[120px] truncate">{touchDragItem.title}</span>
          </div>
        </div>,
        document.body,
      )}

      {/* Create shelf dialog */}
      <ShelfFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={vals => createShelfMutation.mutateAsync(vals)}
        loading={createShelfMutation.isPending}
      />

      {/* Edit shelf dialog */}
      <ShelfFormDialog
        open={!!editingShelf}
        onOpenChange={v => !v && setEditingShelf(null)}
        initial={editingShelf ?? undefined}
        onSubmit={vals => updateShelfMutation.mutateAsync(vals)}
        loading={updateShelfMutation.isPending}
      />

      {/* Delete shelf confirm */}
      <Dialog open={!!deleteShelf} onOpenChange={v => !v && setDeleteShelf(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir estante</DialogTitle>
            <DialogDescription>
              Tem certeza que quer excluir <strong>{deleteShelf?.name}</strong>? Os itens voltarão
              a ser não-posicionados. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteShelf(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteShelfMutation.mutate()}
              disabled={deleteShelfMutation.isPending}
            >
              {deleteShelfMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item detail dialog */}
      <ItemDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={v => !v && setSelectedItem(null)}
        attributeSchema={attributeSchema}
      />
    </div>
  );
}
