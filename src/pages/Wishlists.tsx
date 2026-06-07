import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, MoreVertical, Pencil, Trash2, Globe, Lock } from 'lucide-react';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { EmptyState } from '../components/EmptyState';
import type { Wishlist } from '../types';
import { toast } from 'sonner';

function WishlistForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Wishlist;
  onSubmit: (vals: { name: string; description: string; is_public: boolean }) => Promise<unknown>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), description: description.trim(), is_public: isPublic });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Minha lista de desejos"
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional..."
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="wishlist-public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <label htmlFor="wishlist-public" className="text-sm cursor-pointer">
          Lista pública (qualquer pessoa com o link pode ver)
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

export function Wishlists() {
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Wishlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Wishlist | null>(null);

  const { data: wishlists = [], isLoading } = useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: () => data.listWishlists(user!.id),
    enabled: !!user,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['wishlist-all', user?.id],
    queryFn: () => data.listAllWishlistItems(user!.id),
    enabled: wishlists.length > 0,
  });

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      counts[item.wishlist_id] = (counts[item.wishlist_id] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  const createMutation = useMutation({
    mutationFn: (vals: { name: string; description: string; is_public: boolean }) =>
      data.createWishlist(user!.id, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlists', user?.id] });
      setCreateOpen(false);
      toast.success('Lista criada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: (vals: { name: string; description: string; is_public: boolean }) =>
      data.updateWishlist(editTarget!.id, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlists', user?.id] });
      setEditTarget(null);
      toast.success('Lista atualizada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => data.deleteWishlist(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlists', user?.id] });
      qc.invalidateQueries({ queryKey: ['wishlist-all', user?.id] });
      setDeleteTarget(null);
      toast.success('Lista removida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lista de Desejos</h1>
          <p className="text-muted-foreground text-sm">
            {wishlists.length} lista{wishlists.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova lista
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : wishlists.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-10 w-10" />}
          title="Nenhuma lista de desejos"
          description="Crie sua primeira lista para começar a guardar itens que você deseja."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova lista
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlists.map((wl) => {
            const count = itemCounts[wl.id] ?? 0;
            return (
              <div key={wl.id} className="relative group">
                <Card className="hover:shadow-md transition-shadow h-full overflow-hidden">
                  <Link to={`/wishlists/${wl.id}`} className="block">
                    <div className="aspect-[16/7] relative overflow-hidden bg-gradient-to-br from-pink-500/20 via-primary/10 to-transparent">
                      <div className="absolute bottom-2 left-3 rounded-lg bg-background/90 backdrop-blur-sm p-2 shadow-sm">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div className="absolute top-2 left-2">
                        {wl.is_public ? (
                          <span className="flex items-center gap-1 text-[10px] bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-muted-foreground">
                            <Globe className="h-3 w-3" />Pública
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-muted-foreground">
                            <Lock className="h-3 w-3" />Privada
                          </span>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-3 pt-2.5">
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                        {wl.name}
                      </h3>
                      {wl.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{wl.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {count} item{count !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Link>
                </Card>
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTarget(wl)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(wl)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova lista de desejos</DialogTitle>
          </DialogHeader>
          <WishlistForm
            onSubmit={(vals) => createMutation.mutateAsync(vals)}
            onCancel={() => setCreateOpen(false)}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar lista</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <WishlistForm
              initial={editTarget}
              onSubmit={(vals) => editMutation.mutateAsync(vals)}
              onCancel={() => setEditTarget(null)}
              loading={editMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover lista</DialogTitle>
            <DialogDescription>
              Tem certeza que quer remover <strong>{deleteTarget?.name}</strong>? Todos os itens dentro dela também serão removidos.
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
    </div>
  );
}
