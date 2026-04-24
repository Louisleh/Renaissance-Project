import manifestJson from './_manifest.json';
import type { Card, CardSetManifest, KnowledgeDomain } from '../../types/cards';

const packLoaders = import.meta.glob<{ default: Card[] }>('./v1/*.json');

interface LoadedIndex {
  all: Card[];
  byId: Map<string, Card>;
  byDomain: Map<KnowledgeDomain, Card[]>;
}

let cache: LoadedIndex | null = null;
let pending: Promise<LoadedIndex> | null = null;

function buildIndex(all: Card[]): LoadedIndex {
  const byId = new Map<string, Card>();
  const byDomain = new Map<KnowledgeDomain, Card[]>();
  for (const card of all) {
    byId.set(card.id, card);
    const bucket = byDomain.get(card.domain) ?? [];
    bucket.push(card);
    byDomain.set(card.domain, bucket);
  }
  return { all, byId, byDomain };
}

export async function ensureCardsLoaded(): Promise<LoadedIndex> {
  if (cache) return cache;
  if (pending) return pending;
  pending = Promise.all(Object.values(packLoaders).map((load) => load())).then((modules) => {
    const all = modules.flatMap((m) => m.default);
    cache = buildIndex(all);
    return cache;
  });
  return pending;
}

export function seedCardsSync(all: Card[]): void {
  cache = buildIndex(all);
}

export function cardsReady(): boolean {
  return cache !== null;
}

export function getAllCards(): Card[] {
  return cache ? cache.all : [];
}

export function getCardById(id: string): Card | undefined {
  return cache?.byId.get(id);
}

export function getCardsByDomain(domain: KnowledgeDomain): Card[] {
  return cache?.byDomain.get(domain) ?? [];
}

export function getCardDomains(): KnowledgeDomain[] {
  return cache ? Array.from(cache.byDomain.keys()) : [];
}

export const manifest = manifestJson as CardSetManifest;
