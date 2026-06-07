import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Heart, LayoutGrid, LayoutList, Lock,
  ArrowUpAZ, ArrowDownAZ, CalendarArrowUp, CalendarArrowDown, Share2,
} from 'lucide-react';
import { getPublicWishlist, listPublicWishlistItems } from '../data/public';
import { Button } from '../components/ui/button';
import type { WishlistItem } from '../types';
import { formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type SortKey = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: 'date-desc', label: 'Mais recentes', icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: 'date-asc',  label: 'Mais antigos',  icon: <CalendarArrowUp   className="h-3.5 w-3.5" /> },
  { value: 'title-asc', label: 'A → Z',         icon: <ArrowUpAZ         className="h-3.5 w-3.5" /> },
  { value: 'title-desc',label: 'Z → A',         icon: <ArrowDownAZ       className="h-3.5 w-3.5" /> },
];


export function PublicWishlist() {
  const { id } = useParams<{ id: string }>();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<SortKey>('date-desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState<WishlistItem | null>(null);

  const { data: wishlist, isLoading: loadingWl } = useQuery({
    queryKey: ['public-wishlist', id],
    queryFn: () => getPublicWishlist(id!),
    enabled: !!id,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['public-wishlist-items', id],
    queryFn: () => listPublicWishlistItems(id!),
    enabled: !!id,
  });

  const processed = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'date-desc') return b.created_at.localeCompare(a.created_at);
      if (sortBy === 'date-asc')  return a.created_at.localeCompare(b.created_at);
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      return b.title.localeCompare(a.title);
    });
  }, [items, sortBy]);

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado!');
  };

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy)!;

  if (loadingWl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Esta lista é privada ou não existe.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{wishlist.name}</h1>
          </div>
          {wishlist.description && (
            <p className="text-sm text-muted-foreground mt-1">{wishlist.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={shareLink}>
          <Share2 className="h-4 w-4 mr-1.5" />
          Compartilhar
        </Button>
      </div>

      {/* Toolbar */}
      {items.length > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setSortOpen((v) => !v)}
            >
              {currentSort.icon}
              <span className="hidden sm:inline">{currentSort.label}</span>
            </Button>
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
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Items */}
      {loadingItems ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhum item nesta lista.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {processed.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="group rounded-lg border bg-card hover:shadow-md transition-shadow overflow-hidden text-left"
            >
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Heart className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                )}
                {Object.keys(item.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(item.attributes).slice(0, 2).map(([, v]) => (
                      <span key={v} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {processed.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
            >
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
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {Object.entries(item.attributes).slice(0, 3).map(([, v]) => (
                    <span key={v} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(item.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Item detail dialog */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.photo_url && (
              <img
                src={selected.photo_url}
                alt=""
                className="w-full rounded-md object-cover max-h-48"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              {selected.description && (
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
              )}
            </div>
            {Object.keys(selected.attributes).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selected.attributes).map(([k, v]) => (
                  <span key={k} className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                    <span className="font-medium text-foreground">{k}:</span> {v}
                  </span>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
