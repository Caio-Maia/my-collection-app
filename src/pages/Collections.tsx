import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Library, Plus, MoreVertical, Pencil, Trash2,
  BookOpen, Disc, Film, Music, Star, Heart, Gamepad2,
  Camera, Shirt, Wine, Trophy, Puzzle, Globe, Leaf,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Disc, Film, Music, Star, Heart, Gamepad2,
  Camera, Shirt, Wine, Trophy, Puzzle, Globe, Leaf,
};
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { CollectionForm } from '../components/CollectionForm';
import { EmptyState } from '../components/EmptyState';
import type { Collection } from '../types';
import { toast } from 'sonner';

export function Collections() {
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => data.listCollections(user!.id),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (vals: Omit<Collection, 'id' | 'user_id' | 'created_at'>) =>
      data.createCollection(user!.id, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections', user?.id] });
      setCreateOpen(false);
      toast.success('Coleção criada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: (vals: Omit<Collection, 'id' | 'user_id' | 'created_at'>) =>
      data.updateCollection(editTarget!.id, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections', user?.id] });
      setEditTarget(null);
      toast.success('Coleção atualizada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => data.deleteCollection(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections', user?.id] });
      setDeleteTarget(null);
      toast.success('Coleção removida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coleções</h1>
          <p className="text-muted-foreground text-sm">{collections.length} coleção{collections.length !== 1 ? 'ões' : ''}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova coleção
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<Library className="h-10 w-10" />}
          title="Nenhuma coleção ainda"
          description="Crie sua primeira coleção para começar a organizar seus itens."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova coleção
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div key={col.id} className="relative group">
              <Card className="hover:shadow-md transition-shadow h-full overflow-hidden">
                <Link to={`/collections/${col.id}`} className="block">
                  {/* Cover — ~65% of card height via aspect ratio */}
                  <div className="aspect-[16/7] relative overflow-hidden">
                    {col.cover_image ? (
                      <img src={col.cover_image} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : col.cover_color ? (
                      <div className="w-full h-full" style={{ backgroundColor: col.cover_color }} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
                    )}
                    {/* Dynamic icon badge */}
                    <div className="absolute bottom-2 left-3 rounded-lg bg-background/90 backdrop-blur-sm p-2 shadow-sm">
                      {(() => { const Icon = ICON_MAP[col.icon] ?? BookOpen; return <Icon className="h-5 w-5 text-primary" />; })()}
                    </div>
                  </div>
                  {/* Info */}
                  <CardContent className="p-3 pt-2.5">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                      {col.name}
                    </h3>
                    {col.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{col.description}</p>
                    )}
                  </CardContent>
                </Link>
              </Card>
              {/* Dropdown — over the cover, outside the Link */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(col)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(col)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova coleção</DialogTitle>
          </DialogHeader>
          <CollectionForm
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
            <DialogTitle>Editar coleção</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CollectionForm
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
            <DialogTitle>Remover coleção</DialogTitle>
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
