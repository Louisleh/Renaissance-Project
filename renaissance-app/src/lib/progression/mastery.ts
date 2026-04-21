import { getCardById, getAllCards } from '../../data/flashcards';
import { getLevel } from '../scoring';
import type { CardState, KnowledgeDomain } from '../../types/cards';
import { KNOWLEDGE_DOMAINS } from '../../types/cards';
import type { LevelLabel } from '../../types';

type StatesMap = Record<string, CardState>;

export const MASTERY_STABILITY_CEILING_DAYS = 365;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stabilityToMastery(stability: number): number {
  return clamp01(stability / MASTERY_STABILITY_CEILING_DAYS) * 100;
}

export interface DomainMastery {
  domain: KnowledgeDomain;
  mastery: number;
  level: ReturnType<typeof getLevel>;
  reviewedCount: number;
  totalInDomain: number;
  coverage: number;
}

export function perKnowledgeDomainMastery(states: StatesMap): DomainMastery[] {
  const allCards = getAllCards();
  const totalsByDomain = new Map<KnowledgeDomain, number>();
  for (const card of allCards) {
    totalsByDomain.set(card.domain, (totalsByDomain.get(card.domain) ?? 0) + 1);
  }

  const sumByDomain = new Map<KnowledgeDomain, { sum: number; count: number }>();
  for (const state of Object.values(states)) {
    if (state.reps === 0) continue;
    const card = getCardById(state.card_id);
    if (!card) continue;
    const bucket = sumByDomain.get(card.domain) ?? { sum: 0, count: 0 };
    bucket.sum += stabilityToMastery(state.stability);
    bucket.count += 1;
    sumByDomain.set(card.domain, bucket);
  }

  return KNOWLEDGE_DOMAINS.map((domain) => {
    const total = totalsByDomain.get(domain) ?? 0;
    const bucket = sumByDomain.get(domain);
    const reviewedCount = bucket?.count ?? 0;
    const meanStability = bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;
    const coverage = total === 0 ? 0 : reviewedCount / total;
    const mastery = Math.round(meanStability * coverage);
    return {
      domain,
      mastery,
      level: getLevel(mastery),
      reviewedCount,
      totalInDomain: total,
      coverage,
    };
  });
}

export function synthesisIndex(states: StatesMap): number {
  const domainMasteries = perKnowledgeDomainMastery(states);
  const scores = domainMasteries.map((d) => Math.max(d.mastery, 1));
  if (scores.length === 0) return 0;
  const reciprocalSum = scores.reduce((acc, score) => acc + 1 / score, 0);
  const harmonic = scores.length / reciprocalSum;
  return Math.round(harmonic);
}

export function synthesisLevel(index: number): LevelLabel {
  return getLevel(index);
}

export function overallCoverage(states: StatesMap): number {
  const allCards = getAllCards();
  const touched = Object.values(states).filter((s) => s.reps > 0).length;
  return allCards.length === 0 ? 0 : touched / allCards.length;
}

export interface MasterySnapshot {
  domains: DomainMastery[];
  synthesis_index: number;
  synthesis_level: LevelLabel;
  overall_coverage: number;
  total_reviewed: number;
}

export function masterySnapshot(states: StatesMap): MasterySnapshot {
  const domains = perKnowledgeDomainMastery(states);
  const idx = synthesisIndex(states);
  return {
    domains,
    synthesis_index: idx,
    synthesis_level: synthesisLevel(idx),
    overall_coverage: overallCoverage(states),
    total_reviewed: domains.reduce((total, d) => total + d.reviewedCount, 0),
  };
}
