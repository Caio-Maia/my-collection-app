import { supabase } from '../../lib/supabaseClient';
import type { DataProvider, AuthChangeCallback } from '../DataProvider';
import type { Profile, Collection, CollectionItem, Activity, AuthUser, Shelf, Wishlist, WishlistItem } from '../../types';

function translateAuthError(message: string): string {
  if (message.includes('over_email_send_rate_limit') || message.includes('email rate limit'))
    return 'Limite de emails atingido. Aguarde alguns minutos ou desative a confirmação por email no painel Supabase.';
  if (message.includes('User already registered') || message.includes('already been registered'))
    return 'Não foi possível concluir o cadastro.';
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'Email ou senha inválidos.';
  if (message.includes('Email not confirmed'))
    return 'Confirme seu email antes de entrar.';
  if (message.includes('Password should be at least'))
    return 'Senha deve ter pelo menos 6 caracteres.';
  return message;
}

function toAuthUser(user: { id: string; email?: string }, profile?: Profile | null): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    display_name: profile?.display_name ?? user.email ?? '',
  };
}

export class SupabaseAdapter implements DataProvider {
  async signUp(email: string, password: string, displayName: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw new Error(translateAuthError(error.message));
    if (!data.user) throw new Error('Falha ao criar usuário.');
    return toAuthUser(data.user);
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error.message));
    if (!data.user) throw new Error('Falha ao autenticar.');
    const profile = await this.getProfile(data.user.id);
    return toAuthUser(data.user, profile);
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const profile = await this.getProfile(data.user.id);
    return toAuthUser(data.user, profile);
  }

  onAuthChange(callback: AuthChangeCallback): () => void {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      const profile = await this.getProfile(session.user.id);
      callback(toAuthUser(session.user, profile));
    });
    return () => data.subscription.unsubscribe();
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data ?? null;
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'display_name'>>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async listCollections(userId: string): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getCollection(id: string): Promise<Collection | null> {
    const { data } = await supabase.from('collections').select('*').eq('id', id).single();
    return data ?? null;
  }

  async createCollection(userId: string, data: Omit<Collection, 'id' | 'user_id' | 'created_at'>): Promise<Collection> {
    const { data: result, error } = await supabase
      .from('collections')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateCollection(id: string, data: Partial<Omit<Collection, 'id' | 'user_id' | 'created_at'>>): Promise<Collection> {
    const { data: result, error } = await supabase
      .from('collections')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteCollection(id: string): Promise<void> {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async listItems(collectionId: string): Promise<CollectionItem[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getItem(id: string): Promise<CollectionItem | null> {
    const { data } = await supabase.from('items').select('*').eq('id', id).single();
    return data ?? null;
  }

  private async logActivity(
    userId: string,
    type: Activity['type'],
    collectionId: string,
    collectionName: string,
    itemTitle: string,
  ): Promise<void> {
    await supabase.from('activities').insert({
      user_id: userId,
      type,
      collection_id: collectionId,
      collection_name: collectionName,
      item_title: itemTitle,
    });
  }

  async createItem(
    collectionId: string,
    userId: string,
    data: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>,
  ): Promise<CollectionItem> {
    const { data: result, error } = await supabase
      .from('items')
      .insert({ ...data, collection_id: collectionId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const col = await this.getCollection(collectionId);
    await this.logActivity(userId, 'added', collectionId, col?.name ?? '', result.title);
    return result;
  }

  async updateItem(
    id: string,
    data: Partial<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at'>>,
  ): Promise<CollectionItem> {
    const { data: result, error } = await supabase
      .from('items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const col = await this.getCollection(result.collection_id);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await this.logActivity(userData.user.id, 'edited', result.collection_id, col?.name ?? '', result.title);
    }
    return result;
  }

  async deleteItem(id: string): Promise<void> {
    const item = await this.getItem(id);
    if (item) {
      const col = await this.getCollection(item.collection_id);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await this.logActivity(userData.user.id, 'removed', item.collection_id, col?.name ?? '', item.title);
      }
    }
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async bulkCreateItems(
    collectionId: string,
    userId: string,
    items: Array<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>>,
  ): Promise<CollectionItem[]> {
    const { data, error } = await supabase
      .from('items')
      .insert(items.map((item) => ({ ...item, collection_id: collectionId })))
      .select();
    if (error) throw new Error(error.message);
    const col = await this.getCollection(collectionId);
    for (const item of data ?? []) {
      await this.logActivity(userId, 'added', collectionId, col?.name ?? '', item.title);
    }
    return data ?? [];
  }

  async listActivities(userId: string, limit = 20): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('item-photos').upload(path, file);
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('item-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  async setItemPlacement(
    itemId: string,
    shelfId: string | null,
    row: number | null,
    col: number | null,
  ): Promise<CollectionItem> {
    const { data, error } = await supabase
      .from('items')
      .update({ shelf_id: shelfId, shelf_row: row, shelf_col: col })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async listShelves(collectionId: string): Promise<Shelf[]> {
    const { data, error } = await supabase
      .from('shelves')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createShelf(collectionId: string, data: Pick<Shelf, 'name' | 'rows' | 'cols'>): Promise<Shelf> {
    const { data: result, error } = await supabase
      .from('shelves')
      .insert({ ...data, collection_id: collectionId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateShelf(id: string, data: Partial<Pick<Shelf, 'name' | 'rows' | 'cols'>>): Promise<Shelf> {
    const { data: result, error } = await supabase
      .from('shelves')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Desposicionar itens fora dos novos limites
    if (data.rows !== undefined || data.cols !== undefined) {
      await supabase
        .from('items')
        .update({ shelf_id: null, shelf_row: null, shelf_col: null })
        .eq('shelf_id', id)
        .or(`shelf_row.gte.${result.rows},shelf_col.gte.${result.cols}`);
    }
    return result;
  }

  async deleteShelf(id: string): Promise<void> {
    // on delete set null na FK cuida dos itens
    const { error } = await supabase.from('shelves').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async listWishlists(userId: string): Promise<Wishlist[]> {
    const { data, error } = await supabase
      .from('wishlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getWishlist(id: string): Promise<Wishlist | null> {
    const { data } = await supabase.from('wishlists').select('*').eq('id', id).single();
    return data ?? null;
  }

  async createWishlist(userId: string, data: Pick<Wishlist, 'name' | 'description' | 'is_public'>): Promise<Wishlist> {
    const { data: result, error } = await supabase
      .from('wishlists')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateWishlist(id: string, data: Partial<Pick<Wishlist, 'name' | 'description' | 'is_public'>>): Promise<Wishlist> {
    const { data: result, error } = await supabase
      .from('wishlists')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteWishlist(id: string): Promise<void> {
    const { error } = await supabase.from('wishlists').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async listWishlistItems(wishlistId: string): Promise<WishlistItem[]> {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('wishlist_id', wishlistId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listAllWishlistItems(userId: string): Promise<WishlistItem[]> {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createWishlistItem(
    wishlistId: string,
    userId: string,
    data: Omit<WishlistItem, 'id' | 'wishlist_id' | 'user_id' | 'created_at' | 'updated_at'>,
  ): Promise<WishlistItem> {
    const { data: result, error } = await supabase
      .from('wishlist_items')
      .insert({ ...data, wishlist_id: wishlistId, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateWishlistItem(
    id: string,
    data: Partial<Omit<WishlistItem, 'id' | 'wishlist_id' | 'user_id' | 'created_at'>>,
  ): Promise<WishlistItem> {
    const { data: result, error } = await supabase
      .from('wishlist_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteWishlistItem(id: string): Promise<void> {
    const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async moveWishlistItemToCollection(
    wishlistItemId: string,
    collectionId: string,
    userId: string,
  ): Promise<CollectionItem> {
    const { data: wishlistItem, error: fetchErr } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('id', wishlistItemId)
      .single();
    if (fetchErr || !wishlistItem) throw new Error('Wishlist item not found');
    const created = await this.createItem(collectionId, userId, {
      title: wishlistItem.title,
      description: wishlistItem.description,
      photo_url: wishlistItem.photo_url,
      attributes: wishlistItem.attributes,
      shelf_id: null,
      shelf_row: null,
      shelf_col: null,
    });
    const { error: delErr } = await supabase.from('wishlist_items').delete().eq('id', wishlistItemId);
    if (delErr) throw new Error(delErr.message);
    return created;
  }
}
