export const CARD_SET_VERSION = 1;

export const KNOWLEDGE_DOMAINS = [
  'Biology',
  'Systems Thinking',
  'History & Geopolitics',
  'Economics',
  'Technology',
  'Physics',
  'Philosophy',
  'Mathematics',
  'Chemistry',
  'Psychology',
  'Art & Architecture',
  'Cognitive Science',
  'Cross-Domain',
] as const;

export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number];

export type CardType = 'standard' | 'connection' | 'application' | 'synthesis' | 'scenario';

export type CardDifficulty = 'foundation' | 'intermediate' | 'advanced';

interface CardBase {
  id: string;
  concept: string;
  domain: KnowledgeDomain;
  level?: CardDifficulty;
}

export interface StandardCard extends CardBase {
  type: 'standard';
  oneliner: string;
  whyItMatters: string;
  analogy: string;
}

export interface ConnectionCard extends CardBase {
  type: 'connection';
  conceptA: string;
  domainA: KnowledgeDomain;
  conceptB: string;
  domainB: KnowledgeDomain;
  connection: string;
  insight: string;
  prompt: string;
}

export interface ApplicationCard extends CardBase {
  type: 'application';
  problem: string;
  firstOrder: string;
  secondOrder: string;
  lesson: string;
}

export interface SynthesisCard extends CardBase {
  type: 'synthesis';
  title: string;
  concepts: string[];
  domains: KnowledgeDomain[];
  synthesis: string;
}

export interface ScenarioCard extends CardBase {
  type: 'scenario';
  scenario: string;
  domains: KnowledgeDomain[];
  relevantConcepts: string[];
  explanation: string;
}

export type Card = StandardCard | ConnectionCard | ApplicationCard | SynthesisCard | ScenarioCard;

export type Rating = 1 | 2 | 3 | 4;
export const RATING_AGAIN: Rating = 1;
export const RATING_HARD: Rating = 2;
export const RATING_GOOD: Rating = 3;
export const RATING_EASY: Rating = 4;

export type FsrsCardState = 0 | 1 | 2 | 3;
export const STATE_NEW: FsrsCardState = 0;
export const STATE_LEARNING: FsrsCardState = 1;
export const STATE_REVIEW: FsrsCardState = 2;
export const STATE_RELEARNING: FsrsCardState = 3;

export interface CardState {
  card_id: string;
  card_set_version: number;
  domain: KnowledgeDomain;
  due_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FsrsCardState;
  last_review: string | null;
  updated_at: string;
}

export interface ReviewLogEntry {
  id: string;
  card_id: string;
  domain: KnowledgeDomain;
  rating: Rating;
  duration_ms: number;
  prev_stability: number | null;
  next_stability: number | null;
  reviewed_at: string;
  synced: boolean;
}

export interface CardSetManifest {
  version: number;
  generated_at: string;
  source: string;
  card_count: number;
  duplicates_skipped: number;
  domain_counts: Record<string, number>;
  domain_files: Record<string, string>;
  type_counts: Record<string, number>;
}

export interface StudyDay {
  day: string;
  cards_reviewed: number;
  minutes: number;
  retention_pct: number | null;
}

export interface CommonplaceEntry {
  id: string;
  prompt_id: string;
  prompt_text: string;
  body: string;
  domain_hint: KnowledgeDomain | null;
  created_at: string;
  synced: boolean;
}

export type CardFlagStatus = 'suspended' | 'buried' | 'reported';

export interface CardFlag {
  card_id: string;
  status: CardFlagStatus;
  reason: string | null;
  flagged_at: string;
  bury_until: string | null;
}
