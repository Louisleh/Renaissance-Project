import {
  CURRICULUM_PROGRESS_KEY,
  loadProgress as loadLocalCurriculumProgress,
  saveProgress as saveLocalCurriculumProgress,
} from './curriculum-progress';
import { captureEvent } from './posthog';
import { isSupabaseConfigured, supabase } from './supabase';
import { safeRead, safeWrite, safeRemove } from './safe-local-storage';
import { CARD_STATES_KEY, syncCardStatesOnSignIn, clearLocalCardStates } from './srs/card-state-store';
import { REVIEW_LOG_KEY, flushUnsyncedReviews, clearLocalReviewLog } from './srs/review-log';
import { CARD_FLAGS_KEY, clearLocalCardFlags } from './srs/card-flags';
import { COMMONPLACE_KEY, syncCommonplaceOnSignIn, clearLocalCommonplace } from './progression/commonplace';
import type {
  AssessmentHistoryEntry,
  AssessmentResult,
  CurriculumProgress,
  ProfileIntelligence,
  UserProfile,
} from '../types';

export type AssessmentType = 'quick_pulse' | 'deep_dive' | 'llm_mirror';

const ASSESSMENT_STORAGE_KEYS: Record<AssessmentType, string> = {
  quick_pulse: 'renaissance_quick_pulse_result',
  deep_dive: 'renaissance_deep_dive_result',
  llm_mirror: 'renaissance_llm_mirror_result',
};

const SESSION_STORAGE_KEY = 'renaissance_session_id';

interface AssessmentRow {
  id: string;
  assessment_type: AssessmentType;
  result: AssessmentResult;
  intelligence: ProfileIntelligence | null;
  created_at: string;
}

interface CurriculumProgressRow {
  progress: CurriculumProgress;
  updated_at: string;
}

function readLocalStorage<T>(key: string): T | null {
  return safeRead<T>(key);
}

function writeLocalStorage<T>(key: string, value: T): boolean {
  return safeWrite<T>(key, value);
}

function clearLocalStorageKey(key: string): void {
  safeRemove(key);
}

function loadLocalAssessment(type: AssessmentType): AssessmentResult | null {
  return readLocalStorage<AssessmentResult>(ASSESSMENT_STORAGE_KEYS[type]);
}

function saveLocalAssessment(type: AssessmentType, result: AssessmentResult): void {
  writeLocalStorage(ASSESSMENT_STORAGE_KEYS[type], result);
}

function getCompletedLessonCount(progress: CurriculumProgress): number {
  return Object.values(progress.courses).reduce((total, course) => {
    return total + Object.values(course.lessons).filter((lesson) => lesson.completed).length;
  }, 0);
}

function pickCurriculumProgress(localProgress: CurriculumProgress | null, remoteProgress: CurriculumProgress | null): CurriculumProgress | null {
  if (!localProgress && !remoteProgress) {
    return null;
  }

  if (localProgress && !remoteProgress) {
    return localProgress;
  }

  if (!localProgress && remoteProgress) {
    return remoteProgress;
  }

  const localCompleted = getCompletedLessonCount(localProgress!);
  const remoteCompleted = getCompletedLessonCount(remoteProgress!);

  if (localCompleted > remoteCompleted) {
    return localProgress;
  }

  if (remoteCompleted > localCompleted) {
    return remoteProgress;
  }

  return localProgress;
}

function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-session';
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextSessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

async function fetchRemoteAssessments(userId: string): Promise<AssessmentRow[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('assessments')
    .select('id, assessment_type, result, intelligence, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: String(row.id),
    assessment_type: row.assessment_type as AssessmentType,
    result: row.result as AssessmentResult,
    intelligence: (row.intelligence as ProfileIntelligence | null) ?? null,
    created_at: String(row.created_at),
  }));
}

async function fetchRemoteCurriculumProgress(userId: string): Promise<CurriculumProgress | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('curriculum_progress')
    .select('progress, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data as CurriculumProgressRow).progress;
}

function getLatestByType(rows: AssessmentRow[]): Partial<Record<AssessmentType, AssessmentRow>> {
  return rows.reduce<Partial<Record<AssessmentType, AssessmentRow>>>((latest, row) => {
    const current = latest[row.assessment_type];
    const rowCompletedAt = new Date(row.result.completed_at).getTime();
    const currentCompletedAt = current ? new Date(current.result.completed_at).getTime() : Number.NEGATIVE_INFINITY;

    if (
      !current ||
      rowCompletedAt > currentCompletedAt ||
      (rowCompletedAt === currentCompletedAt && row.intelligence && !current.intelligence)
    ) {
      latest[row.assessment_type] = row;
    }
    return latest;
  }, {});
}

export async function saveAssessmentResult(
  type: AssessmentType,
  result: AssessmentResult,
  intelligence: ProfileIntelligence | null,
  userId: string | null
): Promise<void> {
  saveLocalAssessment(type, result);

  if (!isSupabaseConfigured || !supabase || !userId) {
    return;
  }

  await supabase.from('assessments').insert({
    user_id: userId,
    assessment_type: type,
    result,
    intelligence,
    created_at: result.completed_at,
  });
}

export function loadAssessmentResult(type: 'quick_pulse' | 'deep_dive'): AssessmentResult | null {
  return loadLocalAssessment(type);
}

export async function loadAssessmentHistory(userId: string): Promise<AssessmentHistoryEntry[]> {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return [];
  }

  const rows = await fetchRemoteAssessments(userId);

  return rows
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .map((row) => ({
      id: row.id,
      type: row.assessment_type,
      result: row.result,
      intelligence: row.intelligence,
      created_at: row.created_at,
    }));
}

export async function saveCurriculumProgress(
  progress: CurriculumProgress,
  userId: string | null
): Promise<void> {
  saveLocalCurriculumProgress(progress);

  if (!isSupabaseConfigured || !supabase || !userId) {
    return;
  }

  await supabase
    .from('curriculum_progress')
    .upsert(
      {
        user_id: userId,
        progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}

export function loadCurriculumProgress(): CurriculumProgress | null {
  return loadLocalCurriculumProgress();
}

export async function syncOnSignIn(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const localAssessments = (Object.keys(ASSESSMENT_STORAGE_KEYS) as AssessmentType[])
    .flatMap((type) => {
      const result = loadLocalAssessment(type);
      return result ? [{ type, result }] : [];
    });
  const remoteAssessments = await fetchRemoteAssessments(userId);

  if (remoteAssessments.length === 0 && localAssessments.length > 0) {
    await Promise.all(
      localAssessments.map(({ type, result }) => {
        return supabase!.from('assessments').insert({
          user_id: userId,
          assessment_type: type,
          result,
          intelligence: null,
          created_at: result.completed_at,
        });
      })
    );
  } else if (remoteAssessments.length > 0 && localAssessments.length > 0) {
    const remoteKeys = new Set(
      remoteAssessments.map((row) => `${row.assessment_type}:${row.result.completed_at}`)
    );

    const missingLocalEntries = localAssessments.filter(({ type, result }) => {
      return !remoteKeys.has(`${type}:${result.completed_at}`);
    });

    if (missingLocalEntries.length > 0) {
      await Promise.all(
        missingLocalEntries.map(({ type, result }) => {
          return supabase!.from('assessments').insert({
            user_id: userId,
            assessment_type: type,
            result,
            intelligence: null,
            created_at: result.completed_at,
          });
        })
      );
    }
  }

  const mergedAssessmentRows = [
    ...remoteAssessments,
    ...localAssessments.map(({ type, result }) => ({
      id: `${type}-${result.completed_at}`,
      assessment_type: type,
      result,
      intelligence: null,
      created_at: result.completed_at,
    })),
  ];
  const latestAssessments = getLatestByType(mergedAssessmentRows);

  for (const type of Object.keys(ASSESSMENT_STORAGE_KEYS) as AssessmentType[]) {
    const latest = latestAssessments[type];
    if (latest) {
      saveLocalAssessment(type, latest.result);
    }
  }

  const localProgress = loadLocalCurriculumProgress();
  const remoteProgress = await fetchRemoteCurriculumProgress(userId);
  const mergedProgress = pickCurriculumProgress(localProgress, remoteProgress);

  if (mergedProgress) {
    saveLocalCurriculumProgress(mergedProgress);
    await supabase
      .from('curriculum_progress')
      .upsert(
        {
          user_id: userId,
          progress: mergedProgress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  }

  await syncCardStatesOnSignIn(userId);
  await flushUnsyncedReviews(userId);
  await syncCommonplaceOnSignIn(userId);
}

export async function trackEvent(
  eventName: string,
  eventData: Record<string, unknown> = {},
  userId?: string | null
): Promise<void> {
  // Forward to PostHog regardless of Supabase state
  captureEvent(eventName, eventData);

  if (!isSupabaseConfigured || !supabase || !userId) {
    return;
  }

  await supabase.from('analytics_events').insert({
    user_id: userId,
    event_name: eventName,
    event_data: eventData,
    session_id: getSessionId(),
  });
}

export async function loadUserProfile(userId: string, fallbackEmail: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (!data) {
    const fallbackProfile = {
      id: userId,
      display_name: fallbackEmail.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase.from('profiles').upsert(fallbackProfile, { onConflict: 'id' });

    return {
      id: userId,
      display_name: fallbackProfile.display_name,
      email: fallbackEmail,
      created_at: fallbackProfile.created_at,
    };
  }

  return {
    id: String(data.id),
    display_name: String(data.display_name ?? fallbackEmail.split('@')[0]),
    email: fallbackEmail,
    created_at: String(data.created_at),
  };
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string,
  fallbackEmail: string
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  return loadUserProfile(userId, fallbackEmail);
}

export function clearLocalUserData(): void {
  clearLocalStorageKey(ASSESSMENT_STORAGE_KEYS.quick_pulse);
  clearLocalStorageKey(ASSESSMENT_STORAGE_KEYS.deep_dive);
  clearLocalStorageKey(ASSESSMENT_STORAGE_KEYS.llm_mirror);
  clearLocalStorageKey(CURRICULUM_PROGRESS_KEY);
  clearLocalStorageKey(CARD_STATES_KEY);
  clearLocalStorageKey(REVIEW_LOG_KEY);
  clearLocalStorageKey(COMMONPLACE_KEY);
  clearLocalStorageKey(CARD_FLAGS_KEY);
  clearLocalCardStates();
  clearLocalReviewLog();
  clearLocalCommonplace();
  clearLocalCardFlags();
}

export async function deleteUserData(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('analytics_events').delete().eq('user_id', userId);
    await supabase.from('curriculum_progress').delete().eq('user_id', userId);
    await supabase.from('assessments').delete().eq('user_id', userId);
    await supabase.from('card_states').delete().eq('user_id', userId);
    await supabase.from('card_reviews').delete().eq('user_id', userId);
    await supabase.from('study_days').delete().eq('user_id', userId);
    await supabase.from('user_achievements').delete().eq('user_id', userId);
    await supabase.from('commonplace_entries').delete().eq('user_id', userId);
    await supabase
      .from('profiles')
      .update({
        display_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  clearLocalUserData();
}
