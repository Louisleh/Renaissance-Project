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

// ── Curriculum Types ──

export interface LessonContent {
  body: string;
  prompt?: string;
  takeaway: string;
  reading?: { title: string; author: string };
}

export interface Lesson {
  id: string;
  title: string;
  type: 'read' | 'exercise' | 'scenario' | 'reflection';
  estimated_minutes: number;
  content: LessonContent;
}

export interface CourseModule {
  id: string;
  domain: DomainKey;
  title: string;
  description: string;
  estimated_minutes: number;
  lesson_count: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  prerequisites: DomainKey[];
  lessons: Lesson[];
}

export interface CurriculumData {
  version: number;
  courses: CourseModule[];
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
}

export interface CourseProgress {
  course_id: string;
  domain: DomainKey;
  started_at: string;
  lessons: Record<string, LessonProgress>;
  completed: boolean;
  completed_at: string | null;
}

export interface CurriculumProgress {
  user_started_at: string;
  courses: Record<string, CourseProgress>;
  reassessment_available: boolean;
  baseline_scores?: DomainScores;
  previous_scores?: DomainScores | null;
  latest_scores?: DomainScores;
  latest_assessment_completed_at?: string;
}

// ── Deep Dive Types ──

export interface Scenario {
  id: string;
  title: string;
  context: string;
  questions: Question[];
}

export interface DeepDiveModule {
  module_id: string;
  module_name: string;
  version: number;
  estimated_minutes: number;
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
  core_questions: Question[];
  probe_questions: Record<DomainKey, Question[]>;
  scenarios: Scenario[];
}

export interface DeepDiveState {
  phase: 'core' | 'probing' | 'scenarios' | 'complete';
  coreResponses: QuestionResponse[];
  probeResponses: QuestionResponse[];
  scenarioResponses: QuestionResponse[];
  currentQuestionIndex: number;
  probeDomains: DomainKey[];
  currentScenarioIndex: number;
  totalExpectedQuestions: number;
}

export interface RetakeDelta {
  domain_deltas: Record<DomainKey, { previous: number; current: number; change: number }>;
  archetype_changed: boolean;
  previous_archetype: ArchetypeKey;
  balance_delta: number;
}

// ── Account & Analytics Types ──

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
}

export interface AssessmentHistoryEntry {
  id: string;
  type: 'quick_pulse' | 'deep_dive' | 'llm_mirror';
  result: AssessmentResult;
  intelligence: ProfileIntelligence | null;
  created_at: string;
}

export interface AnalyticsEvent {
  event_name: string;
  event_data: Record<string, unknown>;
  session_id: string;
  created_at: string;
}

// ── Monetization Types ──

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type FeatureKey =
  | 'deep_dive'
  | 'full_curriculum'
  | 'full_intelligence'
  | 'unlimited_history'
  | 'longitudinal_chart'
  | 'shareable_card'
  | 'curated_reading'
  | 'personalized_reading'
  | 'coaching'
  | 'priority_support';

export interface SubscriptionState {
  tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface BookRecommendation {
  title: string;
  author: string;
  domain: DomainKey;
  level: 'foundation' | 'intermediate' | 'advanced';
  description: string;
  affiliate_tag: string;
  isbn: string;
}

export interface CoachingRequest {
  id: string;
  session_type: 'profile_review' | 'growth_sprint';
  preferred_times: string;
  focus_areas: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}
