import { db } from './db';
import type { DataProvider, AuthChangeCallback } from '../DataProvider';
import type { Profile, Collection, CollectionItem, Activity, AuthUser, Shelf } from '../../types';
import { generateId, now, fileToBase64 } from '../../lib/utils';

// DEV-ONLY: LocalAdapter is an unauthenticated, client-editable mock. It must never
// run in production (DataContext enforces this). The session and password hash below
// are intentionally minimal — security is not a goal for this code path.
const SESSION_KEY = 'local-auth-user';

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return String(hash);
}

function getSessionUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

console.warn(
  '[LocalAdapter] Running in local/dev mode: session is stored in localStorage without ' +
  'any server-side enforcement. Do not use with real data.',
);

function setSessionUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export class LocalAdapter implements DataProvider {
  private authCallbacks: Set<AuthChangeCallback> = new Set();

  private notifyAuth(user: AuthUser | null): void {
    this.authCallbacks.forEach((cb) => cb(user));
  }

  async signUp(email: string, password: string, displayName: string): Promise<AuthUser> {
    const existing = await db.users.where('email').equals(email).first();
    if (existing) throw new Error('Não foi possível concluir o cadastro.');

    const id = generateId();
    const createdAt = now();

    await db.users.add({
      id,
      email,
      display_name: displayName,
      password_hash: hashPassword(password),
      created_at: createdAt,
    });

    await db.profiles.add({ id, email, display_name: displayName, created_at: createdAt });

    const user: AuthUser = { id, email, display_name: displayName };
    setSessionUser(user);
    this.notifyAuth(user);
    return user;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const record = await db.users.where('email').equals(email).first();
    if (!record || record.password_hash !== hashPassword(password)) {
      throw new Error('Email ou senha inválidos.');
    }
    const user: AuthUser = { id: record.id, email: record.email, display_name: record.display_name };
    setSessionUser(user);
    this.notifyAuth(user);
    return user;
  }

  async signOut(): Promise<void> {
    setSessionUser(null);
    this.notifyAuth(null);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return getSessionUser();
  }

  onAuthChange(callback: AuthChangeCallback): () => void {
    this.authCallbacks.add(callback);
    // fire immediately with current state
    callback(getSessionUser());
    return () => this.authCallbacks.delete(callback);
  }

  async getProfile(userId: string): Promise<Profile | null> {
    return (await db.profiles.get(userId)) ?? null;
  }

  async updateProfile(userId: string, data: Partial<Pick<Profile, 'display_name'>>): Promise<Profile> {
    await db.profiles.update(userId, data);
    const profile = await db.profiles.get(userId);
    if (!profile) throw new Error('Profile not found');
    // Keep session in sync
    const current = getSessionUser();
    if (current && data.display_name) {
      setSessionUser({ ...current, display_name: data.display_name });
    }
    return profile;
  }

  private normalizeCollection(c: Collection): Collection {
    return { ...c, attribute_schema: c.attribute_schema ?? {}, cover_color: c.cover_color ?? '', cover_image: c.cover_image ?? '', is_public: c.is_public ?? false };
  }

  async listCollections(userId: string): Promise<Collection[]> {
    const rows = await db.collections.where('user_id').equals(userId).toArray();
    return rows.map(c => this.normalizeCollection(c));
  }

  async getCollection(id: string): Promise<Collection | null> {
    const c = await db.collections.get(id);
    return c ? this.normalizeCollection(c) : null;
  }

  async createCollection(userId: string, data: Omit<Collection, 'id' | 'user_id' | 'created_at'>): Promise<Collection> {
    const collection: Collection = { ...data, is_public: data.is_public ?? false, id: generateId(), user_id: userId, created_at: now() };
    await db.collections.add(collection);
    return collection;
  }

  async updateCollection(id: string, data: Partial<Omit<Collection, 'id' | 'user_id' | 'created_at'>>): Promise<Collection> {
    await db.collections.update(id, data);
    const collection = await db.collections.get(id);
    if (!collection) throw new Error('Collection not found');
    return collection;
  }

  async deleteCollection(id: string): Promise<void> {
    const items = await db.items.where('collection_id').equals(id).toArray();
    await db.items.bulkDelete(items.map((i) => i.id));
    await db.collections.delete(id);
  }

  private normalizeItem(i: CollectionItem): CollectionItem {
    return { ...i, shelf_id: i.shelf_id ?? null, shelf_row: i.shelf_row ?? null, shelf_col: i.shelf_col ?? null };
  }

  async listItems(collectionId: string): Promise<CollectionItem[]> {
    const rows = await db.items.where('collection_id').equals(collectionId).toArray();
    return rows.map(i => this.normalizeItem(i));
  }

  async getItem(id: string): Promise<CollectionItem | null> {
    return (await db.items.get(id)) ?? null;
  }

  private async logActivity(
    userId: string,
    type: Activity['type'],
    collectionId: string,
    itemTitle: string,
  ): Promise<void> {
    const col = await db.collections.get(collectionId);
    await db.activities.add({
      id: generateId(),
      user_id: userId,
      type,
      collection_id: collectionId,
      collection_name: col?.name ?? '',
      item_title: itemTitle,
      created_at: now(),
    });
  }

  async createItem(
    collectionId: string,
    userId: string,
    data: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>,
  ): Promise<CollectionItem> {
    const timestamp = now();
    const item: CollectionItem = {
      ...data,
      id: generateId(),
      collection_id: collectionId,
      created_at: timestamp,
      updated_at: timestamp,
    };
    await db.items.add(item);
    await this.logActivity(userId, 'added', collectionId, item.title);
    return item;
  }

  async updateItem(
    id: string,
    data: Partial<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at'>>,
  ): Promise<CollectionItem> {
    await db.items.update(id, { ...data, updated_at: now() });
    const item = await db.items.get(id);
    if (!item) throw new Error('Item not found');
    const col = await db.collections.get(item.collection_id);
    const user = getSessionUser();
    if (user && col) {
      await this.logActivity(user.id, 'edited', item.collection_id, item.title);
    }
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const item = await db.items.get(id);
    if (item) {
      const user = getSessionUser();
      if (user) await this.logActivity(user.id, 'removed', item.collection_id, item.title);
      await db.items.delete(id);
    }
  }

  async bulkCreateItems(
    collectionId: string,
    userId: string,
    items: Array<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>>,
  ): Promise<CollectionItem[]> {
    const timestamp = now();
    const records: CollectionItem[] = items.map((data) => ({
      ...data,
      id: generateId(),
      collection_id: collectionId,
      created_at: timestamp,
      updated_at: timestamp,
    }));
    await db.items.bulkAdd(records);
    const col = await db.collections.get(collectionId);
    for (const r of records) {
      await db.activities.add({
        id: generateId(),
        user_id: userId,
        type: 'added',
        collection_id: collectionId,
        collection_name: col?.name ?? '',
        item_title: r.title,
        created_at: now(),
      });
    }
    return records;
  }

  async listActivities(userId: string, limit = 20): Promise<Activity[]> {
    const all = await db.activities.where('user_id').equals(userId).toArray();
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  async uploadImage(file: File): Promise<string> {
    const base64 = await fileToBase64(file);
    return base64;
  }

  async setItemPlacement(
    itemId: string,
    shelfId: string | null,
    row: number | null,
    col: number | null,
  ): Promise<CollectionItem> {
    await db.items.update(itemId, { shelf_id: shelfId, shelf_row: row, shelf_col: col });
    const item = await db.items.get(itemId);
    if (!item) throw new Error('Item not found');
    return item;
  }

  private normalizeShelf(s: Shelf): Shelf {
    return { ...s, theme: s.theme ?? 'default', theme_color: s.theme_color ?? '' };
  }

  async listShelves(collectionId: string): Promise<Shelf[]> {
    const rows = await db.shelves.where('collection_id').equals(collectionId).toArray();
    return rows.map(s => this.normalizeShelf(s));
  }

  async createShelf(collectionId: string, data: Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>): Promise<Shelf> {
    const shelf: Shelf = {
      ...data,
      theme: data.theme ?? 'default',
      theme_color: data.theme_color ?? '',
      id: generateId(),
      collection_id: collectionId,
      created_at: now(),
    };
    await db.shelves.add(shelf);
    return shelf;
  }

  async updateShelf(id: string, data: Partial<Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>>): Promise<Shelf> {
    await db.shelves.update(id, data);
    const shelf = await db.shelves.get(id);
    if (!shelf) throw new Error('Shelf not found');
    // Desposicionar itens fora dos novos limites
    if (data.rows !== undefined || data.cols !== undefined) {
      const rows = shelf.rows;
      const cols = shelf.cols;
      const outOfBounds = await db.items
        .where('shelf_id').equals(id)
        .filter(item => (item.shelf_row ?? 0) >= rows || (item.shelf_col ?? 0) >= cols)
        .toArray();
      if (outOfBounds.length > 0) {
        await db.items.bulkPut(
          outOfBounds.map(i => ({ ...i, shelf_id: null, shelf_row: null, shelf_col: null }))
        );
      }
    }
    return shelf;
  }

  async deleteShelf(id: string): Promise<void> {
    const items = await db.items.where('shelf_id').equals(id).toArray();
    if (items.length > 0) {
      await db.items.bulkPut(
        items.map(i => ({ ...i, shelf_id: null, shelf_row: null, shelf_col: null }))
      );
    }
    await db.shelves.delete(id);
  }
}
