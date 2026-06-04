import type { Collection, CollectionItem } from '../types';

export interface CollectionExport {
  version: 1;
  collection: Pick<Collection, 'name' | 'description' | 'icon' | 'attribute_schema' | 'cover_color' | 'cover_image'>;
  items: Array<Pick<CollectionItem, 'title' | 'description' | 'photo_url' | 'attributes'>>;
}

export function exportCollection(collection: Collection, items: CollectionItem[]): void {
  const payload: CollectionExport = {
    version: 1,
    collection: {
      name: collection.name,
      description: collection.description,
      icon: collection.icon,
      attribute_schema: collection.attribute_schema,
      cover_color: collection.cover_color,
      cover_image: collection.cover_image,
    },
    items: items.map(({ title, description, photo_url, attributes }) => ({
      title, description, photo_url, attributes,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${collection.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'colecao'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function isCollectionExport(parsed: unknown): parsed is CollectionExport {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as CollectionExport).version === 1 &&
    typeof (parsed as CollectionExport).collection === 'object' &&
    Array.isArray((parsed as CollectionExport).items)
  );
}
