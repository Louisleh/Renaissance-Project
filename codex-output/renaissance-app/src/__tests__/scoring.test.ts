import { describe, it, expect } from 'vitest';
import {
  computeRawScores,
  computeMaxPossible,
  normalize,
  getLevel,
  computeLevels,
  computeClusterScores,
  computeArchetype,
  computeBalanceIndex,
  getTopStrengths,
  getGrowthDomains,
  getRecommendedModules,
  computeFullResult,
} from '../lib/scoring';
import type { DomainKey, DomainScores, QuestionResponse } from '../types';
import moduleData from '../data/quick-pulse-module.json';
import type { QuickPulseModule } from '../types';

const qpData = moduleData as unknown as QuickPulseModule;
const domainKeys = qpData.domains.map(d => d.key);

describe('Scoring Engine', () => {
  describe('computeRawScores', () => {
    it('should compute raw scores from responses', () => {
      const responses: QuestionResponse[] = [
        { question_id: 'qp_01', option_id: 'a' }, // strategy:3, critical_thinking:1
        { question_id: 'qp_02', option_id: 'a' }, // leadership:3, strategy:1
      ];
      const raw = computeRawScores(responses, qpData.questions, domainKeys);
      expect(raw.strategy).toBe(4);       // 3 + 1
      expect(raw.critical_thinking).toBe(1);
      expect(raw.leadership).toBe(3);
      expect(raw.creativity).toBe(0);
    });

    it('should return zero for all domains with no responses', () => {
      const raw = computeRawScores([], qpData.questions, domainKeys);
      for (const key of domainKeys) {
        expect(raw[key]).toBe(0);
      }
    });
  });

  describe('computeMaxPossible', () => {
    it('should compute max possible for each domain', () => {
      const maxes = computeMaxPossible(qpData.questions, domainKeys);
      // Every domain should have a max > 0 since all 8 domains appear across questions
      for (const key of domainKeys) {
        expect(maxes[key]).toBeGreaterThan(0);
      }
    });
  });

  describe('normalize', () => {
    it('should normalize scores to 20-100 range', () => {
      const raw: DomainScores = {
        leadership: 6, creativity: 3, strategy: 9,
        tech_proficiency: 0, problem_solving: 3,
        critical_thinking: 6, adaptability: 3, data_analysis: 0,
      };
      const maxPossible: DomainScores = {
        leadership: 12, creativity: 12, strategy: 12,
        tech_proficiency: 12, problem_solving: 12,
        critical_thinking: 12, adaptability: 12, data_analysis: 12,
      };
      const normalized = normalize(raw, maxPossible);
      expect(normalized.strategy).toBe(80);      // 20 + (9/12)*80 = 80
      expect(normalized.tech_proficiency).toBe(20); // 0 score → 20
      expect(normalized.leadership).toBe(60);     // 20 + (6/12)*80 = 60
    });

    it('should return 20 when max possible is 0', () => {
      const raw: DomainScores = {
        leadership: 0, creativity: 0, strategy: 0,
        tech_proficiency: 0, problem_solving: 0,
        critical_thinking: 0, adaptability: 0, data_analysis: 0,
      };
      const maxPossible: DomainScores = { ...raw };
      const normalized = normalize(raw, maxPossible);
      expect(normalized.leadership).toBe(20);
    });

    it('should clamp to 0-100', () => {
      const raw: DomainScores = {
        leadership: 15, creativity: 0, strategy: 0,
        tech_proficiency: 0, problem_solving: 0,
        critical_thinking: 0, adaptability: 0, data_analysis: 0,
      };
      const maxPossible: DomainScores = {
        leadership: 10, creativity: 10, strategy: 10,
        tech_proficiency: 10, problem_solving: 10,
        critical_thinking: 10, adaptability: 10, data_analysis: 10,
      };
      const normalized = normalize(raw, maxPossible);
      expect(normalized.leadership).toBe(100); // clamped at 100
    });
  });

  describe('getLevel', () => {
    it('should return correct level labels', () => {
      expect(getLevel(0)).toBe('Emerging');
      expect(getLevel(44)).toBe('Emerging');
      expect(getLevel(45)).toBe('Developing');
      expect(getLevel(59)).toBe('Developing');
      expect(getLevel(60)).toBe('Functional');
      expect(getLevel(74)).toBe('Functional');
      expect(getLevel(75)).toBe('Strong');
      expect(getLevel(89)).toBe('Strong');
      expect(getLevel(90)).toBe('Signature');
      expect(getLevel(100)).toBe('Signature');
    });
  });

  describe('computeClusterScores', () => {
    it('should compute cluster scores using spec weights', () => {
      const scores: DomainScores = {
        leadership: 80, creativity: 60, strategy: 70,
        tech_proficiency: 50, problem_solving: 65,
        critical_thinking: 75, adaptability: 70, data_analysis: 55,
      };
      const clusters = computeClusterScores(scores);

      // leader = 80*0.45 + 70*0.25 + 70*0.20 + 60*0.10 = 36 + 17.5 + 14 + 6 = 73.5
      expect(clusters.leader).toBeCloseTo(73.5, 1);

      // strategist = 70*0.40 + 75*0.30 + 55*0.20 + 80*0.10 = 28 + 22.5 + 11 + 8 = 69.5
      expect(clusters.strategist).toBeCloseTo(69.5, 1);
    });

    it('should add breadth bonus when 6+ domains >= 60', () => {
      const balanced: DomainScores = {
        leadership: 70, creativity: 65, strategy: 72,
        tech_proficiency: 60, problem_solving: 68,
        critical_thinking: 66, adaptability: 63, data_analysis: 55,
      };
      const clusters1 = computeClusterScores(balanced); // 7 domains >= 60
      // polymath should include +5 breadth bonus

      const narrow: DomainScores = {
        leadership: 90, creativity: 30, strategy: 85,
        tech_proficiency: 25, problem_solving: 40,
        critical_thinking: 80, adaptability: 35, data_analysis: 20,
      };
      const clusters2 = computeClusterScores(narrow); // only 3 domains >= 60

      // The balanced profile should have breadth bonus on polymath
      const polymathWithoutBonus =
        balanced.creativity * 0.25 + balanced.strategy * 0.20 +
        balanced.critical_thinking * 0.20 + balanced.adaptability * 0.15 +
        balanced.leadership * 0.10 + balanced.problem_solving * 0.10;
      expect(clusters1.polymath).toBeCloseTo(polymathWithoutBonus + 5, 1);
    });
  });

  describe('computeArchetype', () => {
    it('should select the highest cluster as archetype', () => {
      const leaderScores: DomainScores = {
        leadership: 90, creativity: 40, strategy: 50,
        tech_proficiency: 30, problem_solving: 35,
        critical_thinking: 45, adaptability: 85, data_analysis: 30,
      };
      const result = computeArchetype(leaderScores, qpData.archetypes);
      expect(result.key).toBe('leader');
    });

    it('should prefer polymath when close to top and spread is low', () => {
      const balancedScores: DomainScores = {
        leadership: 72, creativity: 70, strategy: 73,
        tech_proficiency: 68, problem_solving: 71,
        critical_thinking: 74, adaptability: 69, data_analysis: 66,
      };
      const result = computeArchetype(balancedScores, qpData.archetypes);
      expect(result.key).toBe('polymath');
    });

    it('should have confidence between 0.35 and 0.85', () => {
      const scores: DomainScores = {
        leadership: 70, creativity: 60, strategy: 80,
        tech_proficiency: 50, problem_solving: 65,
        critical_thinking: 75, adaptability: 55, data_analysis: 60,
      };
      const result = computeArchetype(scores, qpData.archetypes);
      expect(result.confidence).toBeGreaterThanOrEqual(0.35);
      expect(result.confidence).toBeLessThanOrEqual(0.85);
    });
  });

  describe('computeBalanceIndex', () => {
    it('should compute balance using spec formula', () => {
      const scores: DomainScores = {
        leadership: 64, creativity: 72, strategy: 79,
        tech_proficiency: 55, problem_solving: 82,
        critical_thinking: 76, adaptability: 69, data_analysis: 52,
      };
      const values = Object.values(scores);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const spread = Math.max(...values) - Math.min(...values);
      const expected = Math.max(0, Math.min(100, Math.round(avg - spread * 0.35)));
      expect(computeBalanceIndex(scores)).toBe(expected);
    });

    it('should clamp to 0-100', () => {
      const extreme: DomainScores = {
        leadership: 100, creativity: 0, strategy: 0,
        tech_proficiency: 0, problem_solving: 0,
        critical_thinking: 0, adaptability: 0, data_analysis: 0,
      };
      const balance = computeBalanceIndex(extreme);
      expect(balance).toBeGreaterThanOrEqual(0);
      expect(balance).toBeLessThanOrEqual(100);
    });
  });

  describe('getTopStrengths / getGrowthDomains', () => {
    const scores: DomainScores = {
      leadership: 60, creativity: 80, strategy: 90,
      tech_proficiency: 40, problem_solving: 70,
      critical_thinking: 85, adaptability: 55, data_analysis: 45,
    };

    it('should return top 3 strongest domains', () => {
      const top = getTopStrengths(scores, 3);
      expect(top[0]).toBe('strategy');
      expect(top[1]).toBe('critical_thinking');
      expect(top[2]).toBe('creativity');
    });

    it('should return bottom 3 weakest domains', () => {
      const growth = getGrowthDomains(scores, 3);
      expect(growth[0]).toBe('tech_proficiency');
      expect(growth[1]).toBe('data_analysis');
      expect(growth[2]).toBe('adaptability');
    });
  });

  describe('getRecommendedModules', () => {
    it('should map growth domains to starter modules', () => {
      const modules = getRecommendedModules(
        ['data_analysis', 'tech_proficiency', 'adaptability'],
        qpData.starter_module_map
      );
      expect(modules).toEqual([
        'Evidence Before Intuition',
        'Tool Fluency for Non-Specialists',
        'Operating Under Change',
      ]);
    });
  });

  describe('computeFullResult', () => {
    it('should produce a complete result from all answers', () => {
      // Answer all 10 questions with option 'a'
      const responses: QuestionResponse[] = qpData.questions.map(q => ({
        question_id: q.id,
        option_id: 'a',
      }));
      const result = computeFullResult(responses, qpData);

      expect(result.assessment_id).toBe('quick_pulse_v1');
      expect(result.response_count).toBe(10);
      expect(result.top_strengths).toHaveLength(3);
      expect(result.growth_domains).toHaveLength(3);
      expect(result.recommended_modules).toHaveLength(3);
      expect(result.archetype.confidence).toBeGreaterThanOrEqual(0.35);
      expect(result.balance_index).toBeGreaterThanOrEqual(0);
      expect(result.balance_index).toBeLessThanOrEqual(100);

      // All domain scores should be 20-100
      for (const key of domainKeys) {
        expect(result.scores[key]).toBeGreaterThanOrEqual(20);
        expect(result.scores[key]).toBeLessThanOrEqual(100);
      }
    });

    it('should be deterministic', () => {
      const responses: QuestionResponse[] = qpData.questions.map(q => ({
        question_id: q.id,
        option_id: 'b',
      }));
      const r1 = computeFullResult(responses, qpData);
      const r2 = computeFullResult(responses, qpData);
      expect(r1.scores).toEqual(r2.scores);
      expect(r1.archetype.key).toBe(r2.archetype.key);
      expect(r1.balance_index).toBe(r2.balance_index);
    });
  });
});
