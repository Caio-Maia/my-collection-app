import { normalize } from './utils';
import type { WishlistItem } from '../types';

const tokens = (s: string): Set<string> =>
  new Set(normalize(s).split(/[^a-z0-9À-ɏ]+/i).filter(Boolean));

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  return jaccard(tokens(na), tokens(nb));
}

export const SIMILARITY_THRESHOLD = 0.6;

export function findWishlistMatch(
  title: string,
  collectionId: string,
  items: WishlistItem[],
): WishlistItem | null {
  let best: WishlistItem | null = null;
  let bestScore = 0;
  for (const w of items) {
    if (w.target_collection_id !== collectionId) continue;
    const s = nameSimilarity(title, w.title);
    if (s >= SIMILARITY_THRESHOLD && s > bestScore) {
      best = w;
      bestScore = s;
    }
  }
  return best;
}
