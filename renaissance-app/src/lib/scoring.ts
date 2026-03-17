import type {
  DomainKey,
  DomainScores,
  DomainLevels,
  LevelLabel,
  ArchetypeKey,
  ArchetypeResult,
  AssessmentResult,
  Question,
  QuestionResponse,
  QuickPulseModule,
} from '../types';

// ── Raw Score Calculation ──

export function computeRawScores(
  responses: QuestionResponse[],
  questions: Question[],
  domainKeys: DomainKey[]
): DomainScores {
  const raw = Object.fromEntries(domainKeys.map(k => [k, 0])) as DomainScores;

  for (const resp of responses) {
    const question = questions.find(q => q.id === resp.question_id);
    if (!question) continue;
    const option = question.options.find(o => o.id === resp.option_id);
    if (!option?.weights) continue;
    for (const [domain, weight] of Object.entries(option.weights)) {
      if (domain in raw) {
        raw[domain as DomainKey] += weight;
      }
    }
  }

  return raw;
}

// ── Max Possible Per Domain ──

export function computeMaxPossible(
  questions: Question[],
  domainKeys: DomainKey[]
): DomainScores {
  const maxes = Object.fromEntries(domainKeys.map(k => [k, 0])) as DomainScores;

  for (const q of questions) {
    const domainMax: Partial<Record<DomainKey, number>> = {};
    for (const opt of q.options) {
      if (!opt.weights) continue;
      for (const [domain, weight] of Object.entries(opt.weights)) {
        const dk = domain as DomainKey;
        domainMax[dk] = Math.max(domainMax[dk] ?? 0, weight);
      }
    }
    for (const [domain, val] of Object.entries(domainMax)) {
      const dk = domain as DomainKey;
      if (dk in maxes) maxes[dk] += val;
    }
  }

  return maxes;
}

// ── Normalization: raw → 0-100 ──

export function normalize(raw: DomainScores, maxPossible: DomainScores): DomainScores {
  const normalized = {} as DomainScores;
  for (const domain of Object.keys(raw) as DomainKey[]) {
    const maxVal = maxPossible[domain] || 0;
    if (maxVal === 0) {
      normalized[domain] = 20;
      continue;
    }
    normalized[domain] = Math.min(100, Math.max(0, Math.round(20 + (raw[domain] / maxVal) * 80)));
  }
  return normalized;
}

// ── Level Labels ──

export function getLevel(score: number): LevelLabel {
  if (score <= 44) return 'Emerging';
  if (score <= 59) return 'Developing';
  if (score <= 74) return 'Functional';
  if (score <= 89) return 'Strong';
  return 'Signature';
}

export function computeLevels(scores: DomainScores): DomainLevels {
  const levels = {} as DomainLevels;
  for (const [domain, score] of Object.entries(scores)) {
    levels[domain as DomainKey] = getLevel(score);
  }
  return levels;
}

// ── Archetype Calculation ──

export interface ClusterScores {
  leader: number;
  strategist: number;
  builder: number;
  polymath: number;
}

export function computeClusterScores(scores: DomainScores): ClusterScores {
  const s = scores;
  const domainsAbove60 = (Object.values(s) as number[]).filter(v => v >= 60).length;
  const breadthBonus = domainsAbove60 >= 6 ? 5 : 0;

  return {
    leader:
      s.leadership * 0.45 +
      s.adaptability * 0.25 +
      s.strategy * 0.20 +
      s.creativity * 0.10,
    strategist:
      s.strategy * 0.40 +
      s.critical_thinking * 0.30 +
      s.data_analysis * 0.20 +
      s.leadership * 0.10,
    builder:
      s.tech_proficiency * 0.35 +
      s.problem_solving * 0.35 +
      s.data_analysis * 0.20 +
      s.adaptability * 0.10,
    polymath:
      s.creativity * 0.25 +
      s.strategy * 0.20 +
      s.critical_thinking * 0.20 +
      s.adaptability * 0.15 +
      s.leadership * 0.10 +
      s.problem_solving * 0.10 +
      breadthBonus,
  };
}

export function computeArchetype(
  scores: DomainScores,
  archetypes: { key: ArchetypeKey; label: string; description: string }[]
): ArchetypeResult {
  const clusters = computeClusterScores(scores);
  const sorted = (Object.entries(clusters) as [ArchetypeKey, number][]).sort((a, b) => b[1] - a[1]);
  const topKey = sorted[0][0];
  const topScore = sorted[0][1];
  const secondScore = sorted[1][1];

  const values = Object.values(scores) as number[];
  const spread = Math.max(...values) - Math.min(...values);

  let chosenKey = topKey;
  if (topKey !== 'polymath' && clusters.polymath >= topScore - 3 && spread < 30) {
    chosenKey = 'polymath';
  }

  const chosenScore = clusters[chosenKey];
  const nextBest = chosenKey === topKey ? secondScore : topScore;
  const confidence = Math.min(0.85, Math.max(0.35, (chosenScore - nextBest) / 15));

  const archInfo = archetypes.find(a => a.key === chosenKey);
  return {
    key: chosenKey,
    label: archInfo?.label ?? chosenKey,
    description: archInfo?.description ?? '',
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ── Balance Index ──

export function computeBalanceIndex(scores: DomainScores): number {
  const values = Object.values(scores) as number[];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  return Math.max(0, Math.min(100, Math.round(avg - spread * 0.35)));
}

// ── Strengths & Growth ──

export function getTopStrengths(scores: DomainScores, count: number = 3): DomainKey[] {
  return (Object.entries(scores) as [DomainKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([k]) => k);
}

export function getGrowthDomains(scores: DomainScores, count: number = 3): DomainKey[] {
  return (Object.entries(scores) as [DomainKey, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, count)
    .map(([k]) => k);
}

export function getRecommendedModules(
  growthDomains: DomainKey[],
  moduleMap: Record<DomainKey, string>
): string[] {
  return growthDomains.map(d => moduleMap[d] ?? d);
}

// ── Full Result Computation ──

export function computeFullResult(
  responses: QuestionResponse[],
  moduleData: QuickPulseModule
): AssessmentResult {
  const domainKeys = moduleData.domains.map(d => d.key);
  const raw = computeRawScores(responses, moduleData.questions, domainKeys);
  const maxPossible = computeMaxPossible(moduleData.questions, domainKeys);
  const scores = normalize(raw, maxPossible);
  const levels = computeLevels(scores);
  const archetype = computeArchetype(scores, moduleData.archetypes);
  const balanceIndex = computeBalanceIndex(scores);
  const topStrengths = getTopStrengths(scores, 3);
  const growthDomains = getGrowthDomains(scores, 3);
  const recommendedModules = getRecommendedModules(growthDomains, moduleData.starter_module_map);

  return {
    assessment_id: moduleData.module_id,
    assessment_name: moduleData.module_name,
    completed_at: new Date().toISOString(),
    response_count: responses.length,
    responses,
    scores,
    levels,
    top_strengths: topStrengths,
    growth_domains: growthDomains,
    archetype,
    balance_index: balanceIndex,
    recommended_modules: recommendedModules,
  };
}

// ── Domain Label Helper ──

export function domainLabel(key: DomainKey, domains: { key: DomainKey; label: string }[]): string {
  return domains.find(d => d.key === key)?.label ?? key;
}
