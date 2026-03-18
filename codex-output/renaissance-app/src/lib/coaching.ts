import { isSupabaseConfigured, supabase } from './supabase';
import type { AssessmentResult, CoachingRequest } from '../types';

interface SubmitCoachingRequestInput {
  userId: string;
  sessionType: 'profile_review' | 'growth_sprint';
  preferredTimes: string;
  focusAreas: string;
  assessmentSummary: AssessmentResult | null;
}

export async function loadCoachingRequests(userId: string): Promise<CoachingRequest[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('coaching_requests')
    .select('id, session_type, preferred_times, focus_areas, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: String(row.id),
    session_type: row.session_type as CoachingRequest['session_type'],
    preferred_times: typeof row.preferred_times === 'string' ? row.preferred_times : '',
    focus_areas: typeof row.focus_areas === 'string' ? row.focus_areas : '',
    status: row.status as CoachingRequest['status'],
    created_at: String(row.created_at),
  }));
}

export async function submitCoachingRequest(input: SubmitCoachingRequestInput): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { error } = await supabase.from('coaching_requests').insert({
    user_id: input.userId,
    session_type: input.sessionType,
    preferred_times: input.preferredTimes,
    focus_areas: input.focusAreas,
    assessment_summary: input.assessmentSummary,
  });

  return { error };
}
