import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CollectionItem, AttributeSchema } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Normalize a string for case-insensitive comparison: trim + lowercase. */
export function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ATTR_TYPE_ORDER: Record<string, number> = { year: 0, person: 1, duration: 2, text: 3 };

/** Return item attributes sorted by schema type priority (year → person → duration → text → unschema'd). */
export function sortedAttrs(
  item: CollectionItem,
  schema: AttributeSchema,
): Array<[string, string]> {
  return Object.entries(item.attributes ?? {}).sort(([ka], [kb]) => {
    const ta = ATTR_TYPE_ORDER[schema[normalize(ka)]?.type] ?? 4;
    const tb = ATTR_TYPE_ORDER[schema[normalize(kb)]?.type] ?? 4;
    return ta - tb;
  });
}
