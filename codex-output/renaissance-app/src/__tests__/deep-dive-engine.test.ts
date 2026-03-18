import { describe, expect, it } from 'vitest';
import moduleData from '../data/deep-dive-module.json';
import {
  computeDeepDiveResult,
  computeRetakeDelta,
  getCurrentQuestion,
  getProgress,
  goBack,
  initDeepDive,
  submitAnswer,
} from '../lib/deep-dive-engine';
import { computeMaxPossible, computeRawScores, normalize } from '../lib/scoring';
import type { AssessmentResult, DeepDiveModule, DeepDiveState, DomainKey } from '../types';

const deepDiveModule = moduleData as unknown as DeepDiveModule;

function answerWithOption(state: DeepDiveState, optionId: string): DeepDiveState {
  const question = getCurrentQuestion(state, deepDiveModule);

  if (!question) {
    return state;
  }

  return submitAnswer(state, { question_id: question.id, option_id: optionId }, deepDiveModule);
}

function answerCurrentWithFirstOption(state: DeepDiveState): DeepDiveState {
  const question = getCurrentQuestion(state, deepDiveModule);

  if (!question) {
    return state;
  }

  return submitAnswer(state, { question_id: question.id, option_id: question.options[0].id }, deepDiveModule);
}

function getCoreOnlyScores(state: DeepDiveState): Record<DomainKey, number> {
  const domainKeys = deepDiveModule.domains.map((domain) => domain.key);
  const raw = computeRawScores(state.coreResponses, deepDiveModule.core_questions, domainKeys);
  const maxPossible = computeMaxPossible(deepDiveModule.core_questions, domainKeys);
  return normalize(raw, maxPossible);
}

function getCoreSignalCounts(state: DeepDiveState): Record<DomainKey, number> {
  const domainKeys = deepDiveModule.domains.map((domain) => domain.key);

  return state.coreResponses.reduce<Record<DomainKey, number>>((counts, response) => {
    const question = deepDiveModule.core_questions.find((candidate) => candidate.id === response.question_id);
    const option = question?.options.find((candidate) => candidate.id === response.option_id);

    if (!option) {
      return counts;
    }

    for (const domainKey of domainKeys) {
      if ((option.weights[domainKey] ?? 0) > 0) {
        counts[domainKey] += 1;
      }
    }

    return counts;
  }, Object.fromEntries(domainKeys.map((domainKey) => [domainKey, 0])) as Record<DomainKey, number>);
}

function buildQuickPulseLikeResult(): AssessmentResult {
  return {
    assessment_id: 'quick_pulse_v1',
    assessment_name: 'The Quick Pulse',
    completed_at: '2026-02-10T00:00:00.000Z',
    response_count: 10,
    responses: [],
    scores: {
      leadership: 58,
      creativity: 61,
      strategy: 63,
      tech_proficiency: 55,
      problem_solving: 67,
      critical_thinking: 60,
      adaptability: 57,
      data_analysis: 54,
    },
    levels: {
      leadership: 'Developing',
      creativity: 'Functional',
      strategy: 'Functional',
      tech_proficiency: 'Developing',
      problem_solving: 'Functional',
      critical_thinking: 'Functional',
      adaptability: 'Developing',
      data_analysis: 'Developing',
    },
    top_strengths: ['problem_solving', 'strategy', 'creativity'],
    growth_domains: ['data_analysis', 'tech_proficiency', 'adaptability'],
    archetype: {
      key: 'strategist',
      label: 'The Strategist',
      description: 'A systems-oriented thinker.',
      confidence: 0.58,
    },
    balance_index: 56,
    recommended_modules: [
      'Evidence Before Intuition',
      'Tool Fluency for Non-Specialists',
      'Operating Under Change',
    ],
  };
}

describe('deep-dive-engine', () => {
  it('initDeepDive returns the correct initial state', () => {
    const state = initDeepDive(deepDiveModule);

    expect(state.phase).toBe('core');
    expect(state.coreResponses).toEqual([]);
    expect(state.probeResponses).toEqual([]);
    expect(state.scenarioResponses).toEqual([]);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.probeDomains).toEqual([]);
    expect(state.totalExpectedQuestions).toBe(
      deepDiveModule.core_questions.length + deepDiveModule.scenarios.flatMap((scenario) => scenario.questions).length
    );
  });

  it('getCurrentQuestion returns core questions in order during the core phase', () => {
    let state = initDeepDive(deepDiveModule);

    expect(getCurrentQuestion(state, deepDiveModule)?.id).toBe('dd_core_leadership_01');

    state = answerCurrentWithFirstOption(state);
    expect(getCurrentQuestion(state, deepDiveModule)?.id).toBe('dd_core_creativity_01');
  });

  it('submitAnswer advances state correctly through all phases', () => {
    let state = initDeepDive(deepDiveModule);

    for (let index = 0; index < deepDiveModule.core_questions.length; index += 1) {
      state = answerCurrentWithFirstOption(state);
    }

    expect(['probing', 'scenarios']).toContain(state.phase);

    while (state.phase === 'probing') {
      state = answerCurrentWithFirstOption(state);
    }

    expect(state.phase).toBe('scenarios');

    while (state.phase !== 'complete') {
      state = answerCurrentWithFirstOption(state);
    }

    expect(state.phase).toBe('complete');
  });

  it('probe selection chooses domains that match the uncertain or weak-signal rules', () => {
    let state = initDeepDive(deepDiveModule);

    for (let index = 0; index < deepDiveModule.core_questions.length; index += 1) {
      state = answerWithOption(state, getCurrentQuestion(state, deepDiveModule)!.options[3].id);
    }

    const coreScores = getCoreOnlyScores(state);
    const signalCounts = getCoreSignalCounts(state);

    expect(state.phase).toBe('probing');
    expect(
      state.probeDomains.every((domain) => {
        const score = coreScores[domain];
        return (score >= 40 && score <= 65) || signalCounts[domain] <= 1;
      })
    ).toBe(true);
  });

  it('probe selection caps the number of probed domains at six', () => {
    let state = initDeepDive(deepDiveModule);

    for (let index = 0; index < deepDiveModule.core_questions.length; index += 1) {
      state = answerCurrentWithFirstOption(state);
    }

    expect(state.probeDomains.length).toBeLessThanOrEqual(6);
  });

  it('getProgress returns correct phase labels and percentages', () => {
    let state = initDeepDive(deepDiveModule);

    expect(getProgress(state)).toEqual({
      current: 1,
      total: 16,
      phase: 'Core Questions',
      percent: 0,
    });

    state = answerCurrentWithFirstOption(state);

    expect(getProgress(state)).toEqual({
      current: 2,
      total: 16,
      phase: 'Core Questions',
      percent: 6,
    });
  });

  it('computeDeepDiveResult produces a valid AssessmentResult with the expected assessment_id', () => {
    let state = initDeepDive(deepDiveModule);

    while (state.phase !== 'complete') {
      state = answerCurrentWithFirstOption(state);
    }

    const result = computeDeepDiveResult(state, deepDiveModule);

    expect(result.assessment_id).toBe('deep_dive_v1');
    expect(result.assessment_name).toBe('The Deep Dive');
    expect(result.response_count).toBe(result.responses.length);
    expect(result.top_strengths).toHaveLength(3);
    expect(result.growth_domains).toHaveLength(3);
  });

  it('computeRetakeDelta calculates domain and balance deltas correctly', () => {
    const previous = buildQuickPulseLikeResult();
    const current: AssessmentResult = {
      ...previous,
      assessment_id: 'deep_dive_v1',
      assessment_name: 'The Deep Dive',
      scores: {
        ...previous.scores,
        strategy: 74,
        data_analysis: 64,
      },
      archetype: {
        key: 'polymath',
        label: 'The Polymath',
        description: 'Broader synthesis.',
        confidence: 0.67,
      },
      balance_index: 63,
    };

    const delta = computeRetakeDelta(previous, current);

    expect(delta.domain_deltas.strategy).toEqual({ previous: 63, current: 74, change: 11 });
    expect(delta.domain_deltas.data_analysis).toEqual({ previous: 54, current: 64, change: 10 });
    expect(delta.archetype_changed).toBe(true);
    expect(delta.previous_archetype).toBe('strategist');
    expect(delta.balance_delta).toBe(7);
  });

  it('all combined responses feed into the final scoring pipeline', () => {
    let state = initDeepDive(deepDiveModule);

    while (state.phase !== 'complete') {
      state = answerCurrentWithFirstOption(state);
    }

    const result = computeDeepDiveResult(state, deepDiveModule);
    const combinedResponseCount =
      state.coreResponses.length + state.probeResponses.length + state.scenarioResponses.length;

    expect(result.response_count).toBe(combinedResponseCount);
    expect(result.responses).toHaveLength(combinedResponseCount);
    expect(state.scenarioResponses.length).toBe(8);
  });

  it('back navigation works within a phase but does not cross phase boundaries', () => {
    let state = initDeepDive(deepDiveModule);

    state = answerCurrentWithFirstOption(state);
    expect(state.currentQuestionIndex).toBe(1);

    state = goBack(state);
    expect(state.phase).toBe('core');
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.coreResponses).toHaveLength(0);

    for (let index = 0; index < deepDiveModule.core_questions.length; index += 1) {
      state = answerCurrentWithFirstOption(state);
    }

    if (state.phase === 'probing') {
      expect(goBack(state)).toEqual(state);
    }
  });
});
