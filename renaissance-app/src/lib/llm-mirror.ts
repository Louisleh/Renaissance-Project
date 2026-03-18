import type { AssessmentResult, ProfileIntelligence, DomainKey } from '../types';

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
