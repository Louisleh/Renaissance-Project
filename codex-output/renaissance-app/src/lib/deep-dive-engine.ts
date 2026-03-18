import {
  computeArchetype,
  computeBalanceIndex,
  computeLevels,
  computeMaxPossible,
  computeRawScores,
  getGrowthDomains,
  getRecommendedModules,
  getTopStrengths,
  normalize,
} from './scoring';
import type {
  AssessmentResult,
  DeepDiveModule,
  DeepDiveState,
  DomainKey,
  DomainScores,
  Question,
  QuestionResponse,
  RetakeDelta,
  Scenario,
} from '../types';

const UNCERTAIN_MIN = 40;
const UNCERTAIN_MAX = 65;
const MAX_PROBE_DOMAINS = 6;
const SCENARIO_QUESTIONS_PER_SCENARIO = 2;

function getDomainKeys(moduleData: DeepDiveModule): DomainKey[] {
  return moduleData.domains.map((domain) => domain.key);
}

function getScenarioQuestions(moduleData: DeepDiveModule): Question[] {
  return moduleData.scenarios.flatMap((scenario) => scenario.questions);
}

function getCoreScores(responses: QuestionResponse[], moduleData: DeepDiveModule): DomainScores {
  const domainKeys = getDomainKeys(moduleData);
  const raw = computeRawScores(responses, moduleData.core_questions, domainKeys);
  const maxPossible = computeMaxPossible(moduleData.core_questions, domainKeys);
  return normalize(raw, maxPossible);
}

function getSignalCounts(responses: QuestionResponse[], questions: Question[], domainKeys: DomainKey[]): Record<DomainKey, number> {
  return responses.reduce<Record<DomainKey, number>>((counts, response) => {
    const question = questions.find((candidate) => candidate.id === response.question_id);
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

function selectProbeDomains(coreResponses: QuestionResponse[], moduleData: DeepDiveModule): DomainKey[] {
  const domainKeys = getDomainKeys(moduleData);
  const coreScores = getCoreScores(coreResponses, moduleData);
  const signalCounts = getSignalCounts(coreResponses, moduleData.core_questions, domainKeys);

  return domainKeys
    .map((domain) => {
      const score = coreScores[domain];
      const signalCount = signalCounts[domain];
      const inUncertainBand = score >= UNCERTAIN_MIN && score <= UNCERTAIN_MAX;
      const weakSignal = signalCount <= 1;

      return {
        domain,
        score,
        signalCount,
        inUncertainBand,
        weakSignal,
        distanceFromMidpoint: Math.abs(score - 52.5),
      };
    })
    .filter((candidate) => candidate.inUncertainBand || candidate.weakSignal)
    .sort((left, right) => {
      if (left.inUncertainBand !== right.inUncertainBand) {
        return left.inUncertainBand ? -1 : 1;
      }

      if (left.signalCount !== right.signalCount) {
        return left.signalCount - right.signalCount;
      }

      if (left.distanceFromMidpoint !== right.distanceFromMidpoint) {
        return left.distanceFromMidpoint - right.distanceFromMidpoint;
      }

      return left.domain.localeCompare(right.domain);
    })
    .slice(0, MAX_PROBE_DOMAINS)
    .map((candidate) => candidate.domain);
}

function getProbeQuestionForDomain(domain: DomainKey, moduleData: DeepDiveModule, coreScores: DomainScores): Question | null {
  const questions = moduleData.probe_questions[domain];
  if (!questions || questions.length === 0) {
    return null;
  }

  if (questions.length === 1) {
    return questions[0];
  }

  return coreScores[domain] <= 52 ? questions[0] : questions[1];
}

function getSelectedProbeQuestions(state: DeepDiveState, moduleData: DeepDiveModule): Question[] {
  if (state.probeDomains.length === 0) {
    return [];
  }

  const coreScores = getCoreScores(state.coreResponses, moduleData);

  return state.probeDomains.flatMap((domain) => {
    const question = getProbeQuestionForDomain(domain, moduleData, coreScores);
    return question ? [question] : [];
  });
}

function getQuestionIndexWithinScenario(questionIndex: number, scenarios: Scenario[]): number {
  let offset = 0;

  for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex += 1) {
    const scenarioQuestionCount = scenarios[scenarioIndex].questions.length;
    if (questionIndex < offset + scenarioQuestionCount) {
      return scenarioIndex;
    }
    offset += scenarioQuestionCount;
  }

  return Math.max(0, scenarios.length - 1);
}

function getTotalScenarioQuestions(moduleData: DeepDiveModule): number {
  return getScenarioQuestions(moduleData).length;
}

function buildUpdatedResponses(
  existingResponses: QuestionResponse[],
  currentQuestionIndex: number,
  response: QuestionResponse
): QuestionResponse[] {
  return [
    ...existingResponses.slice(0, currentQuestionIndex),
    response,
  ];
}

export function initDeepDive(moduleData: DeepDiveModule): DeepDiveState {
  return {
    phase: 'core',
    coreResponses: [],
    probeResponses: [],
    scenarioResponses: [],
    currentQuestionIndex: 0,
    probeDomains: [],
    currentScenarioIndex: 0,
    totalExpectedQuestions: moduleData.core_questions.length + getTotalScenarioQuestions(moduleData),
  };
}

export function getCurrentQuestion(state: DeepDiveState, moduleData: DeepDiveModule): Question | null {
  if (state.phase === 'core') {
    return moduleData.core_questions[state.currentQuestionIndex] ?? null;
  }

  if (state.phase === 'probing') {
    return getSelectedProbeQuestions(state, moduleData)[state.currentQuestionIndex] ?? null;
  }

  if (state.phase === 'scenarios') {
    return getScenarioQuestions(moduleData)[state.currentQuestionIndex] ?? null;
  }

  return null;
}

export function getCurrentScenarioContext(state: DeepDiveState, moduleData: DeepDiveModule): string | null {
  if (state.phase !== 'scenarios') {
    return null;
  }

  return moduleData.scenarios[state.currentScenarioIndex]?.context ?? null;
}

export function submitAnswer(
  state: DeepDiveState,
  response: QuestionResponse,
  moduleData: DeepDiveModule
): DeepDiveState {
  if (state.phase === 'complete') {
    return state;
  }

  if (state.phase === 'core') {
    const nextCoreResponses = buildUpdatedResponses(state.coreResponses, state.currentQuestionIndex, response);
    const isLastCoreQuestion = state.currentQuestionIndex >= moduleData.core_questions.length - 1;

    if (!isLastCoreQuestion) {
      return {
        ...state,
        coreResponses: nextCoreResponses,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      };
    }

    const probeDomains = selectProbeDomains(nextCoreResponses, moduleData);
    const totalExpectedQuestions = moduleData.core_questions.length + probeDomains.length + getTotalScenarioQuestions(moduleData);

    return {
      ...state,
      phase: probeDomains.length > 0 ? 'probing' : 'scenarios',
      coreResponses: nextCoreResponses,
      currentQuestionIndex: 0,
      probeDomains,
      currentScenarioIndex: 0,
      totalExpectedQuestions,
    };
  }

  if (state.phase === 'probing') {
    const probeQuestions = getSelectedProbeQuestions(state, moduleData);
    const nextProbeResponses = buildUpdatedResponses(state.probeResponses, state.currentQuestionIndex, response);
    const isLastProbeQuestion = state.currentQuestionIndex >= probeQuestions.length - 1;

    if (!isLastProbeQuestion) {
      return {
        ...state,
        probeResponses: nextProbeResponses,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      };
    }

    return {
      ...state,
      phase: 'scenarios',
      probeResponses: nextProbeResponses,
      currentQuestionIndex: 0,
      currentScenarioIndex: 0,
    };
  }

  const scenarioQuestions = getScenarioQuestions(moduleData);
  const nextScenarioResponses = buildUpdatedResponses(state.scenarioResponses, state.currentQuestionIndex, response);
  const isLastScenarioQuestion = state.currentQuestionIndex >= scenarioQuestions.length - 1;

  if (isLastScenarioQuestion) {
    return {
      ...state,
      phase: 'complete',
      scenarioResponses: nextScenarioResponses,
      currentQuestionIndex: scenarioQuestions.length,
      currentScenarioIndex: moduleData.scenarios.length - 1,
    };
  }

  const nextQuestionIndex = state.currentQuestionIndex + 1;

  return {
    ...state,
    scenarioResponses: nextScenarioResponses,
    currentQuestionIndex: nextQuestionIndex,
    currentScenarioIndex: getQuestionIndexWithinScenario(nextQuestionIndex, moduleData.scenarios),
  };
}

export function goBack(state: DeepDiveState): DeepDiveState {
  if (state.phase === 'complete' || state.currentQuestionIndex === 0) {
    return state;
  }

  if (state.phase === 'core') {
    return {
      ...state,
      coreResponses: state.coreResponses.slice(0, -1),
      currentQuestionIndex: state.currentQuestionIndex - 1,
    };
  }

  if (state.phase === 'probing') {
    return {
      ...state,
      probeResponses: state.probeResponses.slice(0, -1),
      currentQuestionIndex: state.currentQuestionIndex - 1,
    };
  }

  const nextQuestionIndex = state.currentQuestionIndex - 1;

  return {
    ...state,
    scenarioResponses: state.scenarioResponses.slice(0, -1),
    currentQuestionIndex: nextQuestionIndex,
    currentScenarioIndex: Math.max(0, Math.floor(nextQuestionIndex / SCENARIO_QUESTIONS_PER_SCENARIO)),
  };
}

export function getProgress(state: DeepDiveState): { current: number; total: number; phase: string; percent: number } {
  const total = state.totalExpectedQuestions;
  const answeredCount = state.coreResponses.length + state.probeResponses.length + state.scenarioResponses.length;

  const phaseLabel = state.phase === 'core'
    ? 'Core Questions'
    : state.phase === 'probing'
      ? 'Adaptive Probes'
      : state.phase === 'scenarios'
        ? 'Scenarios'
        : 'Complete';

  if (state.phase === 'complete') {
    return {
      current: total,
      total,
      phase: phaseLabel,
      percent: 100,
    };
  }

  return {
    current: Math.min(total, answeredCount + 1),
    total,
    phase: phaseLabel,
    percent: total === 0 ? 0 : Math.round((answeredCount / total) * 100),
  };
}

export function computeDeepDiveResult(state: DeepDiveState, moduleData: DeepDiveModule): AssessmentResult {
  const domainKeys = getDomainKeys(moduleData);
  const selectedProbeQuestions = getSelectedProbeQuestions(state, moduleData);
  const scenarioQuestions = getScenarioQuestions(moduleData);
  const allQuestions = [
    ...moduleData.core_questions,
    ...selectedProbeQuestions,
    ...scenarioQuestions,
  ];
  const responses = [
    ...state.coreResponses,
    ...state.probeResponses,
    ...state.scenarioResponses,
  ];
  const rawScores = computeRawScores(responses, allQuestions, domainKeys);
  const maxPossible = computeMaxPossible(allQuestions, domainKeys);
  const scores = normalize(rawScores, maxPossible);
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

export function computeRetakeDelta(
  quickPulseResult: AssessmentResult,
  deepDiveResult: AssessmentResult
): RetakeDelta {
  const domainKeys = Object.keys(deepDiveResult.scores) as DomainKey[];

  return {
    domain_deltas: domainKeys.reduce<RetakeDelta['domain_deltas']>((acc, domain) => {
      const previous = quickPulseResult.scores[domain];
      const current = deepDiveResult.scores[domain];

      acc[domain] = {
        previous,
        current,
        change: current - previous,
      };

      return acc;
    }, {} as RetakeDelta['domain_deltas']),
    archetype_changed: quickPulseResult.archetype.key !== deepDiveResult.archetype.key,
    previous_archetype: quickPulseResult.archetype.key,
    balance_delta: deepDiveResult.balance_index - quickPulseResult.balance_index,
  };
}
