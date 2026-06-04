import { db } from './db';
import type { DataProvider, AuthChangeCallback } from '../DataProvider';
import type { Profile, Collection, CollectionItem, Activity, AuthUser } from '../../types';
import { generateId, now, fileToBase64 } from '../../lib/utils';

const SESSION_KEY = 'local-auth-user';

function hashPassword(password: string): string {
  // Simple deterministic hash for local mock auth (not cryptographically secure)
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
    if (existing) throw new Error('Email já cadastrado.');

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

  async listCollections(userId: string): Promise<Collection[]> {
    const rows = await db.collections.where('user_id').equals(userId).toArray();
    return rows.map(c => ({ attribute_schema: {}, cover_color: '', cover_image: '', ...c }));
  }

  async getCollection(id: string): Promise<Collection | null> {
    const c = await db.collections.get(id);
    return c ? { attribute_schema: {}, cover_color: '', cover_image: '', ...c } : null;
  }

  async createCollection(userId: string, data: Omit<Collection, 'id' | 'user_id' | 'created_at'>): Promise<Collection> {
    const collection: Collection = { ...data, id: generateId(), user_id: userId, created_at: now() };
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

  async listItems(collectionId: string): Promise<CollectionItem[]> {
    return db.items.where('collection_id').equals(collectionId).toArray();
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
}
