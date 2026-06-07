export type AttributeType = 'text' | 'year' | 'person' | 'duration';

export interface AttributeConfig {
  type: AttributeType;
}

export type AttributeSchema = Record<string, AttributeConfig>;

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  collection_type: string;
  attribute_schema: AttributeSchema;
  cover_color: string;
  cover_image: string;
  is_public: boolean;
  created_at: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  title: string;
  description: string;
  photo_url: string;
  attributes: Record<string, string>;
  created_at: string;
  updated_at: string;
  shelf_id: string | null;
  shelf_row: number | null;
  shelf_col: number | null;
}

export interface Shelf {
  id: string;
  collection_id: string;
  name: string;
  rows: number;
  cols: number;
  theme: string;
  theme_color: string;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: 'added' | 'edited' | 'removed';
  collection_id: string;
  collection_name: string;
  item_title: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  user_id: string;
  target_collection_id: string | null;
  title: string;
  description: string;
  photo_url: string;
  attributes: Record<string, string>;
  created_at: string;
  updated_at: string;
}
