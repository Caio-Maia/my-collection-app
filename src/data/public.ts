import { IS_SUPABASE_MODE } from '../lib/config';
import { db } from './local/db';
import { supabase } from '../lib/supabaseClient';
import type { Collection, CollectionItem, AttributeSchema, Wishlist, WishlistItem } from '../types';

function normalizeLocalCollection(c: Collection): Collection {
  return {
    ...c,
    attribute_schema: (c.attribute_schema ?? {}) as AttributeSchema,
    cover_color: c.cover_color ?? '',
    cover_image: c.cover_image ?? '',
    is_public: c.is_public ?? false,
  };
}

export async function getPublicCollection(id: string): Promise<Collection | null> {
  if (IS_SUPABASE_MODE) {
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single();
    return data ?? null;
  }
  const c = await db.collections.get(id);
  if (!c || !c.is_public) return null;
  return normalizeLocalCollection(c);
}

export async function listPublicItems(collectionId: string): Promise<CollectionItem[]> {
  if (IS_SUPABASE_MODE) {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }
  const rows = await db.items.where('collection_id').equals(collectionId).toArray();
  return rows.map(i => ({ ...i, shelf_id: i.shelf_id ?? null, shelf_row: i.shelf_row ?? null, shelf_col: i.shelf_col ?? null }));
}

export async function getPublicWishlist(id: string): Promise<Wishlist | null> {
  if (IS_SUPABASE_MODE) {
    const { data } = await supabase
      .from('wishlists')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single();
    return data ?? null;
  }
  const w = await db.wishlists.get(id);
  if (!w || !w.is_public) return null;
  return w;
}

export async function listPublicWishlistItems(wishlistId: string): Promise<WishlistItem[]> {
  if (IS_SUPABASE_MODE) {
    const { data } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('wishlist_id', wishlistId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }
  return db.wishlistItems.where('wishlist_id').equals(wishlistId).toArray();
}
