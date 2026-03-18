import type {
  AssessmentResult,
  ArchetypeKey,
  ArchetypeResult,
  DomainKey,
  DomainScores,
  ProfileIntelligence,
} from '../types';
import {
  computeArchetype,
  computeBalanceIndex,
  computeLevels,
  getGrowthDomains,
  getTopStrengths,
} from './scoring';

const domainDisplayNames: Record<DomainKey, string> = {
  leadership: 'Leadership',
  creativity: 'Creativity',
  strategy: 'Strategy',
  tech_proficiency: 'Tech Proficiency',
  problem_solving: 'Problem Solving',
  critical_thinking: 'Critical Thinking',
  adaptability: 'Adaptability',
  data_analysis: 'Data Analysis',
};

const archetypeDefinitions: { key: ArchetypeKey; label: string; description: string }[] = [
  { key: 'polymath', label: 'The Polymath', description: 'Unusual breadth, cross-domain transfer, sees connections others miss.' },
  { key: 'strategist', label: 'The Strategist', description: 'Systems thinking, analytical reasoning, models complexity.' },
  { key: 'builder', label: 'The Builder', description: 'Execution, technical implementation, learns by doing.' },
  { key: 'leader', label: 'The Leader', description: 'People alignment, adaptive coordination, clarity under uncertainty.' },
];

// ── Post-Assessment Coaching Prompt (requires existing results) ──

export function generateLlmMirrorPrompt(
  result: AssessmentResult,
  intelligence: ProfileIntelligence,
): string {
  const domainLines = (Object.entries(result.scores) as [DomainKey, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([key, score]) => `  - ${domainDisplayNames[key]}: ${score}/100 (${result.levels[key]})`)
    .join('\n');

  const strengthList = result.top_strengths
    .map(k => domainDisplayNames[k])
    .join(', ');

  const growthList = result.growth_domains
    .map(k => `${domainDisplayNames[k]} (${result.scores[k]})`)
    .join(', ');

  const weakAnalysis = intelligence.weak_domains
    .map(wd => `${wd.label}: ${wd.score} — ${wd.severity} severity${wd.gap_from_functional > 0 ? `, ${wd.gap_from_functional} points below Functional` : ''}`)
    .join('\n  - ');

  return `You are a professional development coach analyzing a Renaissance Skills profile. Use the data below as ground truth about this person's assessed capabilities, then help them understand their profile and plan concrete next steps.

## Profile Data

Archetype: ${result.archetype.label} (confidence: ${Math.round(result.archetype.confidence * 100)}%)
${result.archetype.description}

Profile Type: ${intelligence.profile_type.replace('_', ' ')}
Balance Index: ${result.balance_index}/100

### Domain Scores (0–100)
${domainLines}

### Top Strengths
${strengthList}

### Growth Domains
${growthList}

### Weak Domain Analysis
  - ${weakAnalysis}

### Profile Narrative
${intelligence.narrative.summary}

### Growth Priority
${intelligence.narrative.growth_priority}

---

## Your Task

Using the profile data above as a factual baseline about this person, please:

1. **Mirror back** what this profile reveals about how this person likely thinks, decides, and operates. Be specific — use the domain scores to identify behavioral patterns, not just restate numbers.

2. **Identify blind spots** — based on the gap between their strongest and weakest domains, what kinds of decisions or situations would be hardest for this person? Where might their strengths create overconfidence?

3. **Recommend 3 concrete actions** they can take this week to begin closing their most critical gaps. Each action should be:
   - Specific enough to start immediately
   - Connected to a named weak domain
   - Completable in under 30 minutes

4. **Suggest one question** this person should ask themselves regularly to maintain awareness of their growth edges.

Be direct and practical. Avoid generic advice. Ground everything in the specific score pattern you see.`;
}

// ── Standalone Mirror Analysis Prompt (for chat history analysis) ──

export function generateMirrorAnalysisPrompt(): string {
  return `You are a professional capability assessor. Your job is to analyze the conversation history pasted below and produce a structured skill profile for the person who wrote it.

## The 8 Renaissance Domains

Score each domain 0–100 based on the evidence you observe in the conversation:

1. **Leadership** — Ability to align people, create clarity, move decisions forward
2. **Creativity** — Ability to generate novel approaches, ideas, reframings
3. **Strategy** — Ability to sequence action, model tradeoffs, see leverage
4. **Tech Proficiency** — Practical fluency with tools, systems, workflows
5. **Problem Solving** — Ability to decompose complexity, get to workable solutions
6. **Critical Thinking** — Ability to question assumptions, weigh evidence, reason rigorously
7. **Adaptability** — Ability to adjust plans under changing conditions
8. **Data Analysis** — Ability to use evidence, measurement, quantitative signal

## Scoring Guidelines

- **0–44 (Emerging)**: Little to no evidence of this capability
- **45–59 (Developing)**: Some indicators but inconsistent or surface-level
- **60–74 (Functional)**: Clear, reliable evidence of competence
- **75–89 (Strong)**: Consistent, high-quality demonstrations
- **90–100 (Signature)**: Exceptional, defining capability

Base scores only on evidence in the text. If a domain has no signal, score it at 40 (honest uncertainty rather than a guess). Do not inflate scores to be polite.

## Output Format

Return ONLY the following JSON object — no markdown, no explanation, no preamble. Just the raw JSON:

{
  "scores": {
    "leadership": <number>,
    "creativity": <number>,
    "strategy": <number>,
    "tech_proficiency": <number>,
    "problem_solving": <number>,
    "critical_thinking": <number>,
    "adaptability": <number>,
    "data_analysis": <number>
  },
  "reasoning": {
    "leadership": "<1 sentence of evidence>",
    "creativity": "<1 sentence of evidence>",
    "strategy": "<1 sentence of evidence>",
    "tech_proficiency": "<1 sentence of evidence>",
    "problem_solving": "<1 sentence of evidence>",
    "critical_thinking": "<1 sentence of evidence>",
    "adaptability": "<1 sentence of evidence>",
    "data_analysis": "<1 sentence of evidence>"
  }
}

## Conversation to Analyze

Paste your conversation history below this line:
————————————————————————————————————`;
}

// ── Build AssessmentResult from imported mirror JSON ──

export function buildResultFromMirrorImport(json: {
  scores: Record<string, number>;
  reasoning?: Record<string, string>;
}): AssessmentResult {
  const scores: DomainScores = {
    leadership: clampScore(json.scores.leadership),
    creativity: clampScore(json.scores.creativity),
    strategy: clampScore(json.scores.strategy),
    tech_proficiency: clampScore(json.scores.tech_proficiency),
    problem_solving: clampScore(json.scores.problem_solving),
    critical_thinking: clampScore(json.scores.critical_thinking),
    adaptability: clampScore(json.scores.adaptability),
    data_analysis: clampScore(json.scores.data_analysis),
  };

  const levels = computeLevels(scores);
  const archetype = computeArchetype(scores, archetypeDefinitions);
  const balanceIndex = computeBalanceIndex(scores);
  const topStrengths = getTopStrengths(scores, 3);
  const growthDomains = getGrowthDomains(scores, 3);

  return {
    assessment_id: 'llm_mirror',
    assessment_name: 'LLM Mirror',
    completed_at: new Date().toISOString(),
    response_count: 0,
    responses: [],
    scores,
    levels,
    top_strengths: topStrengths,
    growth_domains: growthDomains,
    archetype,
    balance_index: balanceIndex,
    recommended_modules: growthDomains.map(d => d),
  };
}

// ── Extract reasoning from mirror JSON ──

export type MirrorReasoning = Record<DomainKey, string>;

export function extractMirrorReasoning(json: {
  reasoning?: Record<string, string>;
}): MirrorReasoning | null {
  if (!json.reasoning || typeof json.reasoning !== 'object') return null;

  const allDomains: DomainKey[] = [
    'leadership', 'creativity', 'strategy', 'tech_proficiency',
    'problem_solving', 'critical_thinking', 'adaptability', 'data_analysis',
  ];

  const result = {} as MirrorReasoning;
  for (const d of allDomains) {
    result[d] = typeof json.reasoning[d] === 'string' ? json.reasoning[d] : '';
  }
  return result;
}

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || isNaN(value)) return 40;
  return Math.max(0, Math.min(100, Math.round(value)));
}
