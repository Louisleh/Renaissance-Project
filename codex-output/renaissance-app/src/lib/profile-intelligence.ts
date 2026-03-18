import type {
  DomainKey,
  DomainScores,
  DomainLevels,
  LevelLabel,
  ArchetypeKey,
  AssessmentResult,
  ProfileNarrative,
  WeakDomainAnalysis,
  ArchetypeConfidenceBreakdown,
  CurriculumRecommendation,
  ProfileIntelligence,
} from '../types';
import { computeClusterScores, getLevel } from './scoring';

// ── Profile Type Detection ──

export type ProfileType = 'specialist' | 'balanced' | 'broad_shallow' | 'strong_balanced';

export function detectProfileType(scores: DomainScores): ProfileType {
  const values = Object.values(scores) as number[];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  const aboveFunctional = values.filter(v => v >= 60).length;

  if (spread > 35 && aboveFunctional <= 4) return 'specialist';
  if (avg >= 75 && spread < 20) return 'strong_balanced';
  if (aboveFunctional >= 6 && spread < 25) return 'balanced';
  return 'broad_shallow';
}

// ── Profile Narrative Generation ──

const archetypeNarratives: Record<ArchetypeKey, string> = {
  polymath: 'Your profile shows unusual breadth, with meaningful capability across multiple domains. This pattern suggests you naturally transfer ideas between fields and see connections others miss.',
  strategist: 'Your strongest signal is in systems thinking and analytical reasoning. You tend to design paths through complexity and link decisions to their downstream consequences.',
  builder: 'Your profile centers on execution and technical implementation. You move from concept to artifact quickly, learning through direct engagement with tools and systems.',
  leader: 'Your profile emphasizes people alignment, adaptive coordination, and clarity under uncertainty. You create coherence in groups and adjust effectively when conditions shift.',
};

const profileTypeDescriptions: Record<ProfileType, string> = {
  specialist: 'Your scores show pronounced peaks and valleys — a specialist pattern with clear strengths but notable gaps.',
  balanced: 'You have a reasonably even distribution across domains with functional or better capability in most areas.',
  broad_shallow: 'Your profile is broad but several domains remain below functional level, suggesting opportunities for targeted development.',
  strong_balanced: 'You show strong, well-balanced capability across all eight domains — a rare and valuable pattern.',
};

export function generateNarrative(result: AssessmentResult): ProfileNarrative {
  const { archetype, scores, top_strengths, growth_domains, levels } = result;
  const profileType = detectProfileType(scores);
  const domains = Object.entries(scores) as [DomainKey, number][];

  // Summary: 2-3 sentences combining archetype + profile shape
  const archetypeNarr = archetypeNarratives[archetype.key];
  const profileDesc = profileTypeDescriptions[profileType];
  const summary = `${archetypeNarr} ${profileDesc}`;

  // Archetype rationale
  const clusters = computeClusterScores(scores);
  const sorted = (Object.entries(clusters) as [ArchetypeKey, number][]).sort((a, b) => b[1] - a[1]);
  const topCluster = sorted[0];
  const secondCluster = sorted[1];
  const strengthLabels = top_strengths.map(k => domainDisplayName(k));
  const archetype_rationale = `Your ${archetype.label} assignment is driven by high scores in ${strengthLabels.join(', ')}. ` +
    `Your ${archetype.label.replace('The ', '')} cluster score is ${topCluster[1].toFixed(1)}, ` +
    `compared to ${secondCluster[1].toFixed(1)} for ${formatArchetypeLabel(secondCluster[0])}` +
    (archetype.confidence >= 0.65 ? ' — a clear distinction.' : ' — a close call, suggesting you may flex between types.');

  // Growth priority
  const worstDomain = growth_domains[0];
  const worstScore = scores[worstDomain];
  const worstLevel = levels[worstDomain];
  const growth_priority = `Your most impactful development area is ${domainDisplayName(worstDomain)} ` +
    `(currently ${worstScore}, ${worstLevel}). ` +
    `Raising this domain will directly improve your balance index and unlock broader synthesis capability.`;

  return { summary, archetype_rationale, growth_priority };
}

// ── Weak Domain Analysis ──

export function analyzeWeakDomains(result: AssessmentResult): WeakDomainAnalysis[] {
  const { scores, levels, growth_domains } = result;
  const allDomains = (Object.entries(scores) as [DomainKey, number][])
    .sort((a, b) => a[1] - b[1]);

  return allDomains
    .filter(([k]) => growth_domains.includes(k) || scores[k] < 60)
    .slice(0, Math.max(3, growth_domains.length))
    .map(([domain, score]) => {
      const level = levels[domain];
      const gapFromFunctional = Math.max(0, 60 - score);
      let severity: 'critical' | 'moderate' | 'mild';
      if (score < 45) severity = 'critical';
      else if (score < 60) severity = 'moderate';
      else severity = 'mild';

      return {
        domain,
        label: domainDisplayName(domain),
        score,
        level,
        severity,
        gap_from_functional: gapFromFunctional,
      };
    });
}

// ── Archetype Confidence Breakdown ──

export function buildArchetypeBreakdown(result: AssessmentResult): ArchetypeConfidenceBreakdown {
  const { scores, archetype } = result;
  const clusters = computeClusterScores(scores);
  const sorted = (Object.entries(clusters) as [ArchetypeKey, number][]).sort((a, b) => b[1] - a[1]);

  const chosen = archetype.key;
  const chosenScore = clusters[chosen];
  const runnerUp = sorted.find(([k]) => k !== chosen)!;

  const gap = chosenScore - runnerUp[1];
  let rationale: string;
  if (gap > 8) {
    rationale = `Your ${formatArchetypeLabel(chosen)} score is ${gap.toFixed(1)} points ahead of your next closest type (${formatArchetypeLabel(runnerUp[0])}). This is a strong, clear archetype signal.`;
  } else if (gap > 3) {
    rationale = `Your ${formatArchetypeLabel(chosen)} score leads ${formatArchetypeLabel(runnerUp[0])} by ${gap.toFixed(1)} points. The signal is meaningful but not overwhelming — you have secondary strengths worth developing.`;
  } else {
    rationale = `Your top two archetypes (${formatArchetypeLabel(chosen)} and ${formatArchetypeLabel(runnerUp[0])}) are separated by only ${gap.toFixed(1)} points. You likely flex between these modes depending on context.`;
  }

  return {
    chosen,
    chosen_label: archetype.label,
    chosen_score: Math.round(chosenScore * 10) / 10,
    runner_up: runnerUp[0],
    runner_up_label: formatArchetypeLabel(runnerUp[0]),
    runner_up_score: Math.round(runnerUp[1] * 10) / 10,
    confidence: archetype.confidence,
    rationale,
  };
}

// ── Curriculum Recommendation Engine ──

const moduleDetails: Record<DomainKey, { module: string; time: string; description: string }> = {
  leadership: {
    module: 'Influence Through Clarity',
    time: '4 exercises • 80 minutes',
    description: 'Strengthen narrative framing so insight moves teams rather than remaining privately obvious.',
  },
  creativity: {
    module: 'Cross-Domain Idea Generation',
    time: '4 prompts • 60 minutes',
    description: 'Stretch imaginative range to produce more surprising, high-upside solution spaces.',
  },
  strategy: {
    module: 'Systems Mapping and Leverage',
    time: '3 frameworks • 75 minutes',
    description: 'Build explicit strategic models and clearer sequencing decisions from broad observation.',
  },
  tech_proficiency: {
    module: 'Tool Fluency for Non-Specialists',
    time: '5 micro-lessons • 2 hours',
    description: 'Develop practical fluency with tools and technical workflows to amplify broad capability.',
  },
  problem_solving: {
    module: 'Constraint Decomposition',
    time: '4 micro-lessons • 90 minutes',
    description: 'Sharpen the ability to break complex problems into workable components under ambiguity.',
  },
  critical_thinking: {
    module: 'Assumption Testing',
    time: '3 scenarios • 70 minutes',
    description: 'Strengthen evidence evaluation and reasoning rigor to ground decisions more firmly.',
  },
  adaptability: {
    module: 'Operating Under Change',
    time: '3 scenarios • 70 minutes',
    description: 'Practice rapid plan adjustment without losing strategic coherence when conditions shift.',
  },
  data_analysis: {
    module: 'Evidence Before Intuition',
    time: '4 labs • 85 minutes',
    description: 'Translate qualitative judgment into measurable signals and repeatable decision criteria.',
  },
};

// Dependency graph: some domains are prerequisites for others
const domainDependencies: Partial<Record<DomainKey, DomainKey[]>> = {
  strategy: ['critical_thinking'],
  leadership: ['adaptability'],
  data_analysis: ['critical_thinking'],
};

export function buildCurriculum(result: AssessmentResult): CurriculumRecommendation[] {
  const { scores, levels, growth_domains } = result;

  // Start with growth domains, then add any dependencies that are also weak
  const targetDomains = new Set<DomainKey>(growth_domains);

  // Add dependency domains if they're also below functional
  for (const domain of growth_domains) {
    const deps = domainDependencies[domain];
    if (deps) {
      for (const dep of deps) {
        if (scores[dep] < 60) targetDomains.add(dep);
      }
    }
  }

  // Sort by severity (lowest scores first), but respect dependencies
  const ordered = topologicalSort([...targetDomains], scores);

  return ordered.map((domain, i) => {
    const details = moduleDetails[domain];
    const score = scores[domain];
    const level = levels[domain];

    let priority: 'high' | 'medium' | 'low';
    if (score < 45) priority = 'high';
    else if (score < 60) priority = 'medium';
    else priority = 'low';

    const deps = domainDependencies[domain]?.filter(d => targetDomains.has(d)) ?? [];

    return {
      order: i + 1,
      domain,
      domain_label: domainDisplayName(domain),
      module_name: details.module,
      rationale: `${details.description} Current score: ${score} (${level}).`,
      estimated_time: details.time,
      dependencies: deps,
      priority,
    };
  });
}

function topologicalSort(domains: DomainKey[], scores: DomainScores): DomainKey[] {
  // Simple dependency-aware sort: prerequisites come first, then by severity
  const result: DomainKey[] = [];
  const visited = new Set<DomainKey>();
  const domainSet = new Set(domains);

  function visit(d: DomainKey) {
    if (visited.has(d)) return;
    visited.add(d);
    const deps = domainDependencies[d]?.filter(dep => domainSet.has(dep)) ?? [];
    for (const dep of deps) visit(dep);
    result.push(d);
  }

  // Visit in severity order (lowest score first)
  const sorted = [...domains].sort((a, b) => scores[a] - scores[b]);
  for (const d of sorted) visit(d);

  return result;
}

// ── Balance Interpretation ──

export function interpretBalance(balanceIndex: number, scores: DomainScores): string {
  const values = Object.values(scores) as number[];
  const spread = Math.max(...values) - Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  if (balanceIndex >= 80) {
    return 'Excellent balance — your skills are evenly distributed at a high level. Focus on deepening your strongest domains to reach Signature level.';
  }
  if (balanceIndex >= 65) {
    return 'Good balance with manageable gaps. Targeted development in your weakest 2-3 domains will significantly improve your overall profile.';
  }
  if (balanceIndex >= 50) {
    return `Moderate asymmetry (spread of ${spread} points). Your strongest domains are well-developed, but weaker areas may limit cross-domain synthesis.`;
  }
  return `Significant specialization (spread of ${spread} points, average ${avg.toFixed(0)}). Focused development in your growth domains will unlock substantially more capability.`;
}

// ── Full Profile Intelligence ──

export function generateProfileIntelligence(result: AssessmentResult): ProfileIntelligence {
  return {
    narrative: generateNarrative(result),
    weak_domains: analyzeWeakDomains(result),
    archetype_breakdown: buildArchetypeBreakdown(result),
    curriculum: buildCurriculum(result),
    profile_type: detectProfileType(result.scores),
    balance_interpretation: interpretBalance(result.balance_index, result.scores),
  };
}

// ── Helpers ──

function domainDisplayName(key: DomainKey): string {
  const names: Record<DomainKey, string> = {
    leadership: 'Leadership',
    creativity: 'Creativity',
    strategy: 'Strategy',
    tech_proficiency: 'Tech Proficiency',
    problem_solving: 'Problem Solving',
    critical_thinking: 'Critical Thinking',
    adaptability: 'Adaptability',
    data_analysis: 'Data Analysis',
  };
  return names[key] ?? key;
}

function formatArchetypeLabel(key: ArchetypeKey): string {
  const labels: Record<ArchetypeKey, string> = {
    polymath: 'The Polymath',
    strategist: 'The Strategist',
    builder: 'The Builder',
    leader: 'The Leader',
  };
  return labels[key] ?? key;
}

// ── LLM Mirror Validation (Phase 3) ──

export interface MirrorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMirrorImport(json: unknown): MirrorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['Input must be a JSON object.'], warnings: [] };
  }

  const obj = json as Record<string, unknown>;

  // Check required fields
  if (!obj.scores || typeof obj.scores !== 'object') {
    errors.push('Missing or invalid "scores" object.');
  } else {
    const requiredDomains: DomainKey[] = [
      'leadership', 'creativity', 'strategy', 'tech_proficiency',
      'problem_solving', 'critical_thinking', 'adaptability', 'data_analysis',
    ];
    for (const domain of requiredDomains) {
      const score = (obj.scores as Record<string, unknown>)[domain];
      if (typeof score !== 'number') {
        errors.push(`Missing or non-numeric score for "${domain}".`);
      } else if (score < 0 || score > 100) {
        warnings.push(`Score for "${domain}" is ${score}, outside expected 0-100 range.`);
      }
    }
  }

  if (obj.archetype && typeof obj.archetype === 'object') {
    const arch = obj.archetype as Record<string, unknown>;
    const validKeys: ArchetypeKey[] = ['polymath', 'strategist', 'builder', 'leader'];
    if (!validKeys.includes(arch.key as ArchetypeKey)) {
      errors.push(`Invalid archetype key "${arch.key}". Must be one of: ${validKeys.join(', ')}.`);
    }
    if (typeof arch.confidence !== 'number' || arch.confidence < 0 || arch.confidence > 1) {
      warnings.push('Archetype confidence should be between 0 and 1.');
    }
  } else {
    errors.push('Missing or invalid "archetype" object.');
  }

  if (typeof obj.balance_index !== 'number') {
    warnings.push('Missing "balance_index" — will be computed from scores.');
  }

  return { valid: errors.length === 0, errors, warnings };
}
