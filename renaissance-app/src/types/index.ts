// ── Domain & Assessment Types ──

export type DomainKey =
  | 'leadership'
  | 'creativity'
  | 'strategy'
  | 'tech_proficiency'
  | 'problem_solving'
  | 'critical_thinking'
  | 'adaptability'
  | 'data_analysis';

export type ArchetypeKey = 'polymath' | 'strategist' | 'builder' | 'leader';

export type LevelLabel = 'Emerging' | 'Developing' | 'Functional' | 'Strong' | 'Signature';

export type DomainScores = Record<DomainKey, number>;
export type DomainLevels = Record<DomainKey, LevelLabel>;

export interface Domain {
  key: DomainKey;
  label: string;
  description: string;
}

export interface Level {
  label: LevelLabel;
  min: number;
  max: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  weights: Partial<Record<DomainKey, number>>;
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

export interface ArchetypeDefinition {
  key: ArchetypeKey;
  label: string;
  description: string;
}

export interface QuickPulseModule {
  module_id: string;
  module_name: string;
  version: number;
  estimated_minutes: number;
  question_count: number;
  confidence_label: string;
  intro: {
    headline: string;
    body: string;
    bullets: string[];
  };
  domains: Domain[];
  levels: Level[];
  starter_module_map: Record<DomainKey, string>;
  archetypes: ArchetypeDefinition[];
  questions: Question[];
}

export interface QuestionResponse {
  question_id: string;
  option_id: string;
}

export interface ArchetypeResult {
  key: ArchetypeKey;
  label: string;
  description: string;
  confidence: number;
}

export interface AssessmentResult {
  assessment_id: string;
  assessment_name: string;
  completed_at: string;
  response_count: number;
  responses: QuestionResponse[];
  scores: DomainScores;
  levels: DomainLevels;
  top_strengths: DomainKey[];
  growth_domains: DomainKey[];
  archetype: ArchetypeResult;
  balance_index: number;
  recommended_modules: string[];
}

// ── Profile Intelligence Types (Phase 3) ──

export interface ProfileNarrative {
  summary: string;
  archetype_rationale: string;
  growth_priority: string;
}

export interface WeakDomainAnalysis {
  domain: DomainKey;
  label: string;
  score: number;
  level: LevelLabel;
  severity: 'critical' | 'moderate' | 'mild';
  gap_from_functional: number;
}

export interface ArchetypeConfidenceBreakdown {
  chosen: ArchetypeKey;
  chosen_label: string;
  chosen_score: number;
  runner_up: ArchetypeKey;
  runner_up_label: string;
  runner_up_score: number;
  confidence: number;
  rationale: string;
}

export interface CurriculumRecommendation {
  order: number;
  domain: DomainKey;
  domain_label: string;
  module_name: string;
  rationale: string;
  estimated_time: string;
  dependencies: DomainKey[];
  priority: 'high' | 'medium' | 'low';
}

export interface ProfileIntelligence {
  narrative: ProfileNarrative;
  weak_domains: WeakDomainAnalysis[];
  archetype_breakdown: ArchetypeConfidenceBreakdown;
  curriculum: CurriculumRecommendation[];
  profile_type: 'specialist' | 'balanced' | 'broad_shallow' | 'strong_balanced';
  balance_interpretation: string;
}

// ── UI State Types ──

export type AssessmentMode = 'quick' | 'deep' | 'mirror';

export interface AssessmentModeConfig {
  title: string;
  shortTitle: string;
  duration: string;
  signal: string;
  archetype: ArchetypeKey;
  archetypeDisplay: string;
  summary: string;
  description: string;
  heroCopy: string;
  profile: Record<string, number>;
  growth: GrowthItem[];
  path: PathItem[];
  reading: string;
  coaching: string;
}

export interface GrowthItem {
  meta: string;
  title: string;
  copy: string;
  foot: string;
}

export interface PathItem {
  phase: string;
  title: string;
  copy: string;
  foot: string;
}

export interface ArchetypeInfo {
  title: string;
  description: string;
  strength: string;
  strengthCopy: string;
  balance: string;
  balanceCopy: string;
}
