import type { Profile, Collection, CollectionItem, Activity, AuthUser } from '../types';

export type AuthChangeCallback = (user: AuthUser | null) => void;

export interface DataProvider {
  // Auth
  signUp(email: string, password: string, displayName: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthChange(callback: AuthChangeCallback): () => void;

  // Profile
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, data: Partial<Pick<Profile, 'display_name'>>): Promise<Profile>;

  // Collections
  listCollections(userId: string): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | null>;
  createCollection(userId: string, data: Omit<Collection, 'id' | 'user_id' | 'created_at'>): Promise<Collection>;
  updateCollection(id: string, data: Partial<Omit<Collection, 'id' | 'user_id' | 'created_at'>>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;

  // Items
  listItems(collectionId: string): Promise<CollectionItem[]>;
  getItem(id: string): Promise<CollectionItem | null>;
  createItem(collectionId: string, userId: string, data: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>): Promise<CollectionItem>;
  updateItem(id: string, data: Partial<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at'>>): Promise<CollectionItem>;
  deleteItem(id: string): Promise<void>;
  bulkCreateItems(collectionId: string, userId: string, items: Array<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>>): Promise<CollectionItem[]>;

  // Activity
  listActivities(userId: string, limit?: number): Promise<Activity[]>;

  // Storage
  uploadImage(file: File): Promise<string>;
}
