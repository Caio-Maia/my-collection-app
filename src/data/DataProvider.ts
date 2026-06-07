import type { Profile, Collection, CollectionItem, Activity, AuthUser, Shelf, Wishlist, WishlistItem } from '../types';

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
  updateProfile(userId: string, data: Partial<Pick<Profile, 'display_name' | 'username'>>): Promise<Profile>;

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
  setItemPlacement(itemId: string, shelfId: string | null, row: number | null, col: number | null): Promise<CollectionItem>;

  // Shelves
  listShelves(collectionId: string): Promise<Shelf[]>;
  createShelf(collectionId: string, data: Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>): Promise<Shelf>;
  updateShelf(id: string, data: Partial<Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>>): Promise<Shelf>;
  deleteShelf(id: string): Promise<void>;

  // Activity
  listActivities(userId: string, limit?: number): Promise<Activity[]>;

  // Storage
  uploadImage(file: File): Promise<string>;

  // Wishlists
  listWishlists(userId: string): Promise<Wishlist[]>;
  getWishlist(id: string): Promise<Wishlist | null>;
  createWishlist(userId: string, data: Pick<Wishlist, 'name' | 'description' | 'is_public'>): Promise<Wishlist>;
  updateWishlist(id: string, data: Partial<Pick<Wishlist, 'name' | 'description' | 'is_public'>>): Promise<Wishlist>;
  deleteWishlist(id: string): Promise<void>;

  listWishlistItems(wishlistId: string): Promise<WishlistItem[]>;
  listAllWishlistItems(userId: string): Promise<WishlistItem[]>;
  createWishlistItem(wishlistId: string, userId: string, data: Omit<WishlistItem, 'id' | 'wishlist_id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<WishlistItem>;
  updateWishlistItem(id: string, data: Partial<Omit<WishlistItem, 'id' | 'wishlist_id' | 'user_id' | 'created_at'>>): Promise<WishlistItem>;
  deleteWishlistItem(id: string): Promise<void>;
  moveWishlistItemToCollection(wishlistItemId: string, collectionId: string, userId: string): Promise<CollectionItem>;
}
