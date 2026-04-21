import manifestJson from './_manifest.json';
import artAndArchitecture from './v1/art-and-architecture.json';
import biology from './v1/biology.json';
import chemistry from './v1/chemistry.json';
import cognitiveScience from './v1/cognitive-science.json';
import crossDomain from './v1/cross-domain.json';
import economics from './v1/economics.json';
import historyAndGeopolitics from './v1/history-and-geopolitics.json';
import mathematics from './v1/mathematics.json';
import philosophy from './v1/philosophy.json';
import physics from './v1/physics.json';
import psychology from './v1/psychology.json';
import systemsThinking from './v1/systems-thinking.json';
import technology from './v1/technology.json';
import type { Card, CardSetManifest, KnowledgeDomain } from '../../types/cards';

const allPacks: ReadonlyArray<ReadonlyArray<unknown>> = [
  artAndArchitecture,
  biology,
  chemistry,
  cognitiveScience,
  crossDomain,
  economics,
  historyAndGeopolitics,
  mathematics,
  philosophy,
  physics,
  psychology,
  systemsThinking,
  technology,
];

const allCards: Card[] = allPacks.flat() as Card[];
const byId = new Map<string, Card>();
const byDomain = new Map<KnowledgeDomain, Card[]>();

for (const card of allCards) {
  byId.set(card.id, card);
  const bucket = byDomain.get(card.domain) ?? [];
  bucket.push(card);
  byDomain.set(card.domain, bucket);
}

export const manifest = manifestJson as CardSetManifest;

export function getAllCards(): Card[] {
  return allCards;
}

export function getCardById(id: string): Card | undefined {
  return byId.get(id);
}

export function getCardsByDomain(domain: KnowledgeDomain): Card[] {
  return byDomain.get(domain) ?? [];
}

export function getCardDomains(): KnowledgeDomain[] {
  return Array.from(byDomain.keys());
}
