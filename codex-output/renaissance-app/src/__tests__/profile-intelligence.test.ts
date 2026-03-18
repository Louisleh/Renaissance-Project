import { describe, it, expect } from 'vitest';
import {
  detectProfileType,
  generateNarrative,
  analyzeWeakDomains,
  buildArchetypeBreakdown,
  buildCurriculum,
  interpretBalance,
  generateProfileIntelligence,
  validateMirrorImport,
} from '../lib/profile-intelligence';
import { computeFullResult } from '../lib/scoring';
import type { DomainScores, QuestionResponse } from '../types';
import moduleData from '../data/quick-pulse-module.json';
import type { QuickPulseModule } from '../types';

const qpData = moduleData as unknown as QuickPulseModule;

// Helper: create a result from all-same-option answers
function createResult(optionId: string) {
  const responses: QuestionResponse[] = qpData.questions.map(q => ({
    question_id: q.id,
    option_id: optionId,
  }));
  return computeFullResult(responses, qpData);
}

describe('Profile Intelligence', () => {
  describe('detectProfileType', () => {
    it('should detect specialist profile', () => {
      const specialist: DomainScores = {
        leadership: 90, creativity: 30, strategy: 85,
        tech_proficiency: 25, problem_solving: 40,
        critical_thinking: 88, adaptability: 35, data_analysis: 20,
      };
      expect(detectProfileType(specialist)).toBe('specialist');
    });

    it('should detect strong balanced profile', () => {
      const strong: DomainScores = {
        leadership: 85, creativity: 80, strategy: 82,
        tech_proficiency: 78, problem_solving: 83,
        critical_thinking: 81, adaptability: 79, data_analysis: 77,
      };
      expect(detectProfileType(strong)).toBe('strong_balanced');
    });

    it('should detect balanced profile', () => {
      const balanced: DomainScores = {
        leadership: 70, creativity: 65, strategy: 72,
        tech_proficiency: 60, problem_solving: 68,
        critical_thinking: 66, adaptability: 63, data_analysis: 61,
      };
      expect(detectProfileType(balanced)).toBe('balanced');
    });
  });

  describe('generateNarrative', () => {
    it('should generate a multi-part narrative', () => {
      const result = createResult('a');
      const narrative = generateNarrative(result);

      expect(narrative.summary).toBeTruthy();
      expect(narrative.summary.length).toBeGreaterThan(50);
      expect(narrative.archetype_rationale).toBeTruthy();
      expect(narrative.archetype_rationale).toContain(result.archetype.label);
      expect(narrative.growth_priority).toBeTruthy();
    });
  });

  describe('analyzeWeakDomains', () => {
    it('should identify weak domains with severity', () => {
      const result = createResult('a');
      const analysis = analyzeWeakDomains(result);

      expect(analysis.length).toBeGreaterThanOrEqual(3);
      for (const wd of analysis) {
        expect(['critical', 'moderate', 'mild']).toContain(wd.severity);
        expect(wd.score).toBeGreaterThanOrEqual(0);
        expect(wd.gap_from_functional).toBeGreaterThanOrEqual(0);
      }
    });

    it('should rank by severity correctly', () => {
      const result = createResult('c'); // Answers biased toward tech/problem_solving
      const analysis = analyzeWeakDomains(result);

      // Weakest should have highest severity or lowest score
      if (analysis.length >= 2) {
        // First item should be among the weakest
        expect(analysis[0].score).toBeLessThanOrEqual(analysis[analysis.length - 1].score);
      }
    });
  });

  describe('buildArchetypeBreakdown', () => {
    it('should provide confidence breakdown with rationale', () => {
      const result = createResult('a');
      const breakdown = buildArchetypeBreakdown(result);

      expect(breakdown.chosen).toBe(result.archetype.key);
      expect(breakdown.runner_up).not.toBe(breakdown.chosen);
      expect(breakdown.chosen_score).toBeGreaterThan(0);
      expect(breakdown.rationale).toBeTruthy();
      expect(breakdown.rationale.length).toBeGreaterThan(20);
    });
  });

  describe('buildCurriculum', () => {
    it('should produce ordered curriculum recommendations', () => {
      const result = createResult('b');
      const curriculum = buildCurriculum(result);

      expect(curriculum.length).toBeGreaterThanOrEqual(3);

      // Each should have required fields
      for (const c of curriculum) {
        expect(c.order).toBeGreaterThan(0);
        expect(c.module_name).toBeTruthy();
        expect(c.domain_label).toBeTruthy();
        expect(c.rationale).toBeTruthy();
        expect(c.estimated_time).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(c.priority);
      }

      // Orders should be sequential
      curriculum.forEach((c, i) => {
        expect(c.order).toBe(i + 1);
      });
    });

    it('should respect dependency ordering', () => {
      const result = createResult('d'); // creativity-heavy answers
      const curriculum = buildCurriculum(result);

      // If both strategy and critical_thinking appear, critical_thinking should come first
      // (since it's a dependency of strategy)
      const strategyIdx = curriculum.findIndex(c => c.domain === 'strategy');
      const ctIdx = curriculum.findIndex(c => c.domain === 'critical_thinking');
      if (strategyIdx >= 0 && ctIdx >= 0) {
        expect(ctIdx).toBeLessThan(strategyIdx);
      }
    });
  });

  describe('interpretBalance', () => {
    it('should return appropriate interpretation for different balance levels', () => {
      const scores: DomainScores = {
        leadership: 70, creativity: 70, strategy: 70,
        tech_proficiency: 70, problem_solving: 70,
        critical_thinking: 70, adaptability: 70, data_analysis: 70,
      };
      const interp = interpretBalance(80, scores);
      expect(interp).toContain('Excellent');

      const interp2 = interpretBalance(40, scores);
      expect(interp2).toContain('Significant');
    });
  });

  describe('generateProfileIntelligence', () => {
    it('should produce complete intelligence object', () => {
      const result = createResult('a');
      const intel = generateProfileIntelligence(result);

      expect(intel.narrative).toBeTruthy();
      expect(intel.weak_domains.length).toBeGreaterThanOrEqual(3);
      expect(intel.archetype_breakdown).toBeTruthy();
      expect(intel.curriculum.length).toBeGreaterThanOrEqual(3);
      expect(['specialist', 'balanced', 'broad_shallow', 'strong_balanced']).toContain(intel.profile_type);
      expect(intel.balance_interpretation).toBeTruthy();
    });
  });

  describe('validateMirrorImport', () => {
    it('should validate correct mirror JSON', () => {
      const valid = {
        scores: {
          leadership: 70, creativity: 65, strategy: 80,
          tech_proficiency: 55, problem_solving: 72,
          critical_thinking: 78, adaptability: 60, data_analysis: 50,
        },
        archetype: { key: 'strategist', label: 'The Strategist', confidence: 0.68 },
        balance_index: 62,
      };
      const result = validateMirrorImport(valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing scores', () => {
      const result = validateMirrorImport({ archetype: { key: 'builder' } });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid archetype key', () => {
      const result = validateMirrorImport({
        scores: {
          leadership: 70, creativity: 65, strategy: 80,
          tech_proficiency: 55, problem_solving: 72,
          critical_thinking: 78, adaptability: 60, data_analysis: 50,
        },
        archetype: { key: 'wizard', label: 'The Wizard', confidence: 0.5 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('archetype key'))).toBe(true);
    });

    it('should warn about out-of-range scores', () => {
      const result = validateMirrorImport({
        scores: {
          leadership: 150, creativity: 65, strategy: 80,
          tech_proficiency: 55, problem_solving: 72,
          critical_thinking: 78, adaptability: 60, data_analysis: 50,
        },
        archetype: { key: 'strategist', label: 'The Strategist', confidence: 0.68 },
      });
      expect(result.valid).toBe(true); // warnings don't make it invalid
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject non-object input', () => {
      expect(validateMirrorImport(null).valid).toBe(false);
      expect(validateMirrorImport('string').valid).toBe(false);
      expect(validateMirrorImport(42).valid).toBe(false);
    });
  });
});
