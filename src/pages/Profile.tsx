import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { User, Package, Heart, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { IS_SUPABASE_MODE } from '../lib/config';
import { toast } from 'sonner';

export function Profile() {
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.display_name ?? '');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState(
    user?.username ?? user?.email?.split('@')[0] ?? ''
  );

  const { data: collections = [] } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => data.listCollections(user!.id),
    enabled: !!user,
  });

  const itemCountQueries = useQuery({
    queryKey: ['allItemCounts', collections.map((c) => c.id)],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        collections.map(async (col) => {
          const items = await data.listItems(col.id);
          counts[col.id] = items.length;
        })
      );
      return counts;
    },
    enabled: collections.length > 0,
  });

  const totalItems = Object.values(itemCountQueries.data ?? {}).reduce((a, b) => a + b, 0);

  const { data: wishlists = [] } = useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: () => data.listWishlists(user!.id),
    enabled: !!user,
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist-all', user?.id],
    queryFn: () => data.listAllWishlistItems(user!.id),
    enabled: !!user,
  });

  const wishlistItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of wishlistItems) {
      counts[item.wishlist_id] = (counts[item.wishlist_id] ?? 0) + 1;
    }
    return counts;
  }, [wishlistItems]);

  const updateMutation = useMutation({
    mutationFn: (name: string) => data.updateProfile(user!.id, { display_name: name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      setEditingName(false);
      toast.success('Nome atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const usernameMutation = useMutation({
    mutationFn: (username: string) => data.updateProfile(user!.id, { username }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      setEditingUsername(false);
      toast.success('Nome de usuário atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (user?.display_name ?? user?.email ?? '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      {/* User card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateMutation.mutate(nameValue);
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => updateMutation.mutate(nameValue)}
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => { setEditingName(false); setNameValue(user?.display_name ?? ''); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg truncate">{user?.display_name}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditingName(true)}
                  title="Editar nome"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {editingUsername ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  value={usernameValue}
                  onChange={(e) => setUsernameValue(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') usernameMutation.mutate(usernameValue);
                    if (e.key === 'Escape') setEditingUsername(false);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => usernameMutation.mutate(usernameValue)}
                  disabled={usernameMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { setEditingUsername(false); setUsernameValue(user?.username ?? user?.email?.split('@')[0] ?? ''); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-sm text-muted-foreground">@{user?.username ?? user?.email?.split('@')[0]}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setEditingUsername(true)}
                  title="Editar nome de usuário"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {!IS_SUPABASE_MODE && (
              <p className="text-xs text-amber-600 mt-1">Modo local (sem Supabase)</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center p-4">
            <p className="text-3xl font-bold text-primary">{collections.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Coleções</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-4">
            <p className="text-3xl font-bold text-primary">{totalItems}</p>
            <p className="text-sm text-muted-foreground mt-1">Itens no total</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="text-center p-4">
            <p className="text-3xl font-bold text-primary">{wishlistItems.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Itens desejados</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-collection breakdown */}
      {collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Itens por coleção
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {collections.map((col, i) => {
                const count = itemCountQueries.data?.[col.id] ?? 0;
                return (
                  <li key={col.id}>
                    {i > 0 && <Separator />}
                    <Link
                      to={`/collections/${col.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="rounded-md bg-primary/10 p-1.5">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <span className="flex-1 text-sm font-medium">{col.name}</span>
                      <span className="text-sm text-muted-foreground">{count} item{count !== 1 ? 's' : ''}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Per-wishlist breakdown */}
      {wishlists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Lista de Desejos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {wishlists.map((wl, i) => {
                const count = wishlistItemCounts[wl.id] ?? 0;
                return (
                  <li key={wl.id}>
                    {i > 0 && <Separator />}
                    <Link
                      to={`/wishlists/${wl.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="rounded-md bg-pink-500/10 p-1.5">
                        <Heart className="h-4 w-4 text-pink-500" />
                      </div>
                      <span className="flex-1 text-sm font-medium">{wl.name}</span>
                      <span className="text-sm text-muted-foreground">{count} item{count !== 1 ? 's' : ''}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
