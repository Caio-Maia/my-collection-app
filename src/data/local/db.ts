import Dexie, { type Table } from 'dexie';
import type { Profile, Collection, CollectionItem, Activity, Shelf, Wishlist, WishlistItem } from '../../types';

interface LocalUser {
  id: string;
  email: string;
  display_name: string;
  username: string;
  password_hash: string;
  created_at: string;
}

interface StoredImage {
  id: string;
  data: string; // base64 or blob URL
  created_at: string;
}

export class CollectionsDB extends Dexie {
  users!: Table<LocalUser>;
  profiles!: Table<Profile>;
  collections!: Table<Collection>;
  items!: Table<CollectionItem>;
  activities!: Table<Activity>;
  images!: Table<StoredImage>;
  shelves!: Table<Shelf>;
  wishlists!: Table<Wishlist>;
  wishlistItems!: Table<WishlistItem>;

  constructor() {
    super('my-collection-db');
    this.version(1).stores({
      users: 'id, email',
      profiles: 'id, email',
      collections: 'id, user_id, created_at',
      items: 'id, collection_id, created_at',
      activities: 'id, user_id, created_at',
      images: 'id',
    });
    this.version(2).stores({
      users: 'id, email',
      profiles: 'id, email',
      collections: 'id, user_id, created_at',
      items: 'id, collection_id, created_at, shelf_id',
      activities: 'id, user_id, created_at',
      images: 'id',
      shelves: 'id, collection_id, created_at',
    });
    this.version(3).stores({
      users: 'id, email',
      profiles: 'id, email',
      collections: 'id, user_id, created_at',
      items: 'id, collection_id, created_at, shelf_id',
      activities: 'id, user_id, created_at',
      images: 'id',
      shelves: 'id, collection_id, created_at',
      wishlists: 'id, user_id, created_at',
      wishlistItems: 'id, wishlist_id, user_id, target_collection_id, created_at',
    });
    this.version(4).stores({
      users: 'id, email',
      profiles: 'id, email',
      collections: 'id, user_id, created_at',
      items: 'id, collection_id, created_at, shelf_id',
      activities: 'id, user_id, created_at',
      images: 'id',
      shelves: 'id, collection_id, created_at',
      wishlists: 'id, user_id, created_at',
      wishlistItems: 'id, wishlist_id, user_id, target_collection_id, created_at',
    });
    this.version(5).stores({
      users: 'id, email, &username',
      profiles: 'id, email, &username',
      collections: 'id, user_id, created_at',
      items: 'id, collection_id, created_at, shelf_id',
      activities: 'id, user_id, created_at',
      images: 'id',
      shelves: 'id, collection_id, created_at',
      wishlists: 'id, user_id, created_at',
      wishlistItems: 'id, wishlist_id, user_id, target_collection_id, created_at',
    });
  }
}

export const db = new CollectionsDB();

export type { LocalUser };
