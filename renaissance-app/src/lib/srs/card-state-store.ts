import { isSupabaseConfigured, supabase } from '../supabase';
import { CARD_SET_VERSION, type CardState, type KnowledgeDomain } from '../../types/cards';

export const CARD_STATES_KEY = 'renaissance_card_states';

type StatesMap = Record<string, CardState>;

interface CardStateRow {
  card_id: string;
  card_set_version: number;
  domain: string;
  due_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  updated_at: string;
}

function readLocal(): StatesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CARD_STATES_KEY);
    return raw ? (JSON.parse(raw) as StatesMap) : {};
  } catch {
    return {};
  }
}

function writeLocal(states: StatesMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CARD_STATES_KEY, JSON.stringify(states));
}

export function loadCardStates(): StatesMap {
  return readLocal();
}

export function loadCardState(cardId: string): CardState | null {
  return readLocal()[cardId] ?? null;
}

export async function saveCardState(state: CardState, userId: string | null): Promise<void> {
  const states = readLocal();
  states[state.card_id] = state;
  writeLocal(states);

  if (!isSupabaseConfigured || !supabase || !userId) return;

  await supabase.from('card_states').upsert(
    {
      user_id: userId,
      card_id: state.card_id,
      card_set_version: state.card_set_version,
      domain: state.domain,
      due_at: state.due_at,
      stability: state.stability,
      difficulty: state.difficulty,
      elapsed_days: state.elapsed_days,
      scheduled_days: state.scheduled_days,
      reps: state.reps,
      lapses: state.lapses,
      state: state.state,
      last_review: state.last_review,
      updated_at: state.updated_at,
    },
    { onConflict: 'user_id,card_id' },
  );
}

function rowToState(row: CardStateRow): CardState {
  return {
    card_id: row.card_id,
    card_set_version: row.card_set_version,
    domain: row.domain as KnowledgeDomain,
    due_at: row.due_at,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as CardState['state'],
    last_review: row.last_review,
    updated_at: row.updated_at,
  };
}

export async function syncCardStatesOnSignIn(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const localStates = readLocal();

  const { data, error } = await supabase
    .from('card_states')
    .select('card_id, card_set_version, domain, due_at, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, updated_at')
    .eq('user_id', userId);

  const remoteStates: StatesMap = {};
  if (!error && data) {
    for (const row of data as CardStateRow[]) {
      remoteStates[row.card_id] = rowToState(row);
    }
  }

  const merged: StatesMap = { ...remoteStates };
  const toPush: CardState[] = [];
  for (const [id, local] of Object.entries(localStates)) {
    const remote = remoteStates[id];
    if (!remote) {
      merged[id] = local;
      toPush.push(local);
      continue;
    }
    const localUpdated = new Date(local.updated_at).getTime();
    const remoteUpdated = new Date(remote.updated_at).getTime();
    if (localUpdated > remoteUpdated) {
      merged[id] = local;
      toPush.push(local);
    }
  }

  writeLocal(merged);

  if (toPush.length > 0) {
    await supabase.from('card_states').upsert(
      toPush.map((state) => ({
        user_id: userId,
        card_id: state.card_id,
        card_set_version: state.card_set_version,
        domain: state.domain,
        due_at: state.due_at,
        stability: state.stability,
        difficulty: state.difficulty,
        elapsed_days: state.elapsed_days,
        scheduled_days: state.scheduled_days,
        reps: state.reps,
        lapses: state.lapses,
        state: state.state,
        last_review: state.last_review,
        updated_at: state.updated_at,
      })),
      { onConflict: 'user_id,card_id' },
    );
  }
}

export function clearLocalCardStates(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CARD_STATES_KEY);
}

export function cardSetVersion(): number {
  return CARD_SET_VERSION;
}
