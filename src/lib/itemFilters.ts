import type { CollectionItem } from '../types';
import { normalize } from './utils';

export type SortKey = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc';

export const SORT_LABELS: Record<SortKey, string> = {
  'date-desc': 'Mais recentes',
  'date-asc':  'Mais antigos',
  'title-asc': 'A → Z',
  'title-desc': 'Z → A',
};

export function sortItems(items: CollectionItem[], sort: SortKey): CollectionItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'title-asc':  return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      case 'date-asc':   return a.created_at.localeCompare(b.created_at);
      case 'date-desc':  return b.created_at.localeCompare(a.created_at);
    }
  });
}

export interface RangeFilter { key: string; from: number; to: number; label: string; }

export function normTag(key: string, value: string): string {
  return `${normalize(key)}::${normalize(value)}`;
}

export const LIST_ATTR_KEYS = new Set(['atores', 'gênero', 'genero']);

export function attrValues(normKey: string, raw: string): string[] {
  if (!LIST_ATTR_KEYS.has(normKey)) return [raw.trim()];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function collectTags(items: CollectionItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach(item => {
    Object.entries(item.attributes ?? {}).forEach(([k, v]) => {
      if (!k.trim() || !v.trim()) return;
      const nk = normalize(k);
      attrValues(nk, v).forEach(val => {
        const norm = normTag(k, val);
        if (!seen.has(norm)) { seen.add(norm); result.push(`${k.trim()}::${val}`); }
      });
    });
  });
  return result.sort((a, b) => a.localeCompare(b));
}

export function tagLabel(tag: string): { key: string; value: string } {
  const idx = tag.indexOf('::');
  return { key: tag.slice(0, idx), value: tag.slice(idx + 2) };
}

export function collectTagsByKey(
  allTags: string[],
): Map<string, { displayKey: string; values: string[] }> {
  const map = new Map<string, { displayKey: string; values: string[] }>();
  allTags.forEach(tag => {
    const { key, value } = tagLabel(tag);
    const nk = normalize(key);
    if (!map.has(nk)) map.set(nk, { displayKey: key, values: [] });
    map.get(nk)!.values.push(value);
  });
  return map;
}

export function itemMatchesTags(item: CollectionItem, tags: Set<string>): boolean {
  if (tags.size === 0) return true;
  const itemTags = new Set<string>();
  Object.entries(item.attributes ?? {}).forEach(([k, v]) => {
    attrValues(normalize(k), v).forEach(val => itemTags.add(normTag(k, val)));
  });
  for (const t of tags) if (itemTags.has(t)) return true;
  return false;
}

export function itemMatchesRanges(item: CollectionItem, ranges: RangeFilter[]): boolean {
  if (ranges.length === 0) return true;
  const byKey = new Map<string, RangeFilter[]>();
  ranges.forEach(r => { if (!byKey.has(r.key)) byKey.set(r.key, []); byKey.get(r.key)!.push(r); });
  for (const [normKey, keyRanges] of byKey.entries()) {
    const entry = Object.entries(item.attributes ?? {}).find(([k]) => normalize(k) === normKey);
    if (!entry) return false;
    const num = parseFloat(entry[1]);
    if (isNaN(num)) return false;
    if (!keyRanges.some(r => num >= r.from && num <= r.to)) return false;
  }
  return true;
}

export function isAllNumeric(values: string[]): boolean {
  return values.length > 0 && values.every(v => v.trim() !== '' && isFinite(parseFloat(v)));
}

export function looksLikeYears(values: string[]): boolean {
  const nums = values.map(v => parseInt(v)).filter(n => !isNaN(n));
  return nums.length > 0 && nums.every(n => n >= 1800 && n <= 2200);
}

export function autoRanges(values: string[]): Array<{ label: string; from: number; to: number }> {
  const nums = values.map(v => parseFloat(v)).filter(n => isFinite(n));
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ label: String(min), from: min, to: max }];
  const range = max - min;
  if (range <= 8) return [...new Set(nums)].sort((a, b) => a - b).map(n => ({ label: String(n), from: n, to: n }));
  const rawStep = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / mag) * mag;
  const start = Math.floor(min / step) * step;
  const result: Array<{ label: string; from: number; to: number }> = [];
  for (let i = 0; i < 5; i++) {
    const from = start + i * step;
    const to = from + step - 1;
    if (from > max) break;
    result.push({ label: `${from}–${Math.min(to, Math.ceil(max))}`, from, to: i === 4 ? Infinity : to });
  }
  return result;
}

export function getDecades(values: string[]): Array<{ label: string; from: number; to: number }> {
  const set = new Set<number>();
  values.forEach(v => { const y = parseInt(v); if (!isNaN(y)) set.add(Math.floor(y / 10) * 10); });
  return Array.from(set).sort().map(d => ({ label: d >= 2000 ? String(d) : String(d % 100), from: d, to: d + 9 }));
}

export const DURATION_PRESETS = [
  { label: '< 60 min',   from: 0,   to: 59       },
  { label: '60–90 min',  from: 60,  to: 90       },
  { label: '90–120 min', from: 91,  to: 120      },
  { label: '> 120 min',  from: 121, to: Infinity },
];

export const IMDB_PRESETS = [
  { label: '< 6', from: 0, to: 5.99     },
  { label: '6–7', from: 6, to: 6.99     },
  { label: '7–8', from: 7, to: 7.99     },
  { label: '8–9', from: 8, to: 8.99     },
  { label: '≥ 9', from: 9, to: Infinity },
];

export const RATING_ATTR_KEYS = new Set(['imdb']);
export const TEXT_MAX_CHIPS = 8;
