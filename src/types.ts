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
  attribute_schema: AttributeSchema;
  cover_color: string;
  cover_image: string;
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
