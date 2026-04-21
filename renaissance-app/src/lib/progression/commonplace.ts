import { isSupabaseConfigured, supabase } from '../supabase';
import type { CommonplaceEntry, KnowledgeDomain } from '../../types/cards';

export const COMMONPLACE_KEY = 'renaissance_commonplace_entries';

interface CommonplaceRow {
  id: string;
  prompt_id: string;
  prompt_text: string;
  body: string;
  domain_hint: string | null;
  created_at: string;
}

function readLocal(): CommonplaceEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(COMMONPLACE_KEY);
    return raw ? (JSON.parse(raw) as CommonplaceEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: CommonplaceEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMMONPLACE_KEY, JSON.stringify(entries));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `cp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface AppendCommonplaceInput {
  prompt_id: string;
  prompt_text: string;
  body: string;
  domain_hint: KnowledgeDomain | null;
}

export async function appendCommonplaceEntry(
  input: AppendCommonplaceInput,
  userId: string | null,
): Promise<CommonplaceEntry> {
  const entry: CommonplaceEntry = {
    id: generateId(),
    prompt_id: input.prompt_id,
    prompt_text: input.prompt_text,
    body: input.body,
    domain_hint: input.domain_hint,
    created_at: new Date().toISOString(),
    synced: false,
  };

  const list = readLocal();
  list.push(entry);
  writeLocal(list);

  if (!isSupabaseConfigured || !supabase || !userId) return entry;

  const { error } = await supabase.from('commonplace_entries').insert({
    user_id: userId,
    prompt_id: entry.prompt_id,
    prompt_text: entry.prompt_text,
    body: entry.body,
    domain_hint: entry.domain_hint,
    created_at: entry.created_at,
  });

  if (!error) {
    const current = readLocal();
    writeLocal(current.map((e) => (e.id === entry.id ? { ...e, synced: true } : e)));
    entry.synced = true;
  }

  return entry;
}

export function loadCommonplaceEntries(): CommonplaceEntry[] {
  return readLocal();
}

export async function syncCommonplaceOnSignIn(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const local = readLocal();
  const unsynced = local.filter((e) => !e.synced);

  if (unsynced.length > 0) {
    const { error } = await supabase.from('commonplace_entries').insert(
      unsynced.map((e) => ({
        user_id: userId,
        prompt_id: e.prompt_id,
        prompt_text: e.prompt_text,
        body: e.body,
        domain_hint: e.domain_hint,
        created_at: e.created_at,
      })),
    );
    if (!error) {
      writeLocal(local.map((e) => (!e.synced ? { ...e, synced: true } : e)));
    }
  }

  const { data } = await supabase
    .from('commonplace_entries')
    .select('id, prompt_id, prompt_text, body, domain_hint, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (!data) return;

  const rows = data as CommonplaceRow[];
  const byKey = new Map<string, CommonplaceEntry>();
  for (const entry of readLocal()) {
    const key = `${entry.prompt_id}:${entry.created_at}`;
    byKey.set(key, entry);
  }
  for (const row of rows) {
    const key = `${row.prompt_id}:${row.created_at}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: row.id,
        prompt_id: row.prompt_id,
        prompt_text: row.prompt_text,
        body: row.body,
        domain_hint: (row.domain_hint as KnowledgeDomain | null) ?? null,
        created_at: row.created_at,
        synced: true,
      });
    }
  }
  const merged = Array.from(byKey.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  writeLocal(merged);
}

export function clearLocalCommonplace(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(COMMONPLACE_KEY);
}

export interface CommonplacePrompt {
  id: string;
  prompt: string;
  domain_hint: KnowledgeDomain | null;
}

export const COMMONPLACE_PROMPTS: CommonplacePrompt[] = [
  { id: 'daily_observation', prompt: 'What did you notice today that you could not have noticed a year ago?', domain_hint: null },
  { id: 'connection_sighting', prompt: 'Where did two unrelated fields of your week turn out to share a structure?', domain_hint: 'Cross-Domain' },
  { id: 'belief_revision', prompt: 'What belief did you revise this week, and what evidence moved you?', domain_hint: 'Cognitive Science' },
  { id: 'system_under_load', prompt: 'Pick a system around you. What would reveal the most about it if it were suddenly stressed?', domain_hint: 'Systems Thinking' },
  { id: 'asymmetry', prompt: 'What risk did you take that had asymmetric payoff? What did you avoid that had symmetric but boring payoff?', domain_hint: 'Economics' },
  { id: 'map_vs_territory', prompt: 'Where this week did your map diverge from the territory, and what did the gap teach you?', domain_hint: 'Philosophy' },
  { id: 'second_order', prompt: 'Describe a recent decision by its second-order consequences, not its first.', domain_hint: 'Economics' },
  { id: 'principle_in_practice', prompt: 'Name one principle you acted on today. What did executing it feel like?', domain_hint: 'Philosophy' },
  { id: 'weakest_argument', prompt: 'What is the strongest version of a view you disagree with?', domain_hint: 'Cognitive Science' },
  { id: 'memory_trace', prompt: 'What did you learn this week that you want to still remember in a decade?', domain_hint: null },
  { id: 'craft_friction', prompt: 'Where does your current craft feel slow? What would make the next attempt one percent faster?', domain_hint: null },
  { id: 'invisible_infrastructure', prompt: 'What invisible infrastructure made today possible? Who built it, and why does it keep working?', domain_hint: 'Technology' },
  { id: 'biological_echo', prompt: 'Where did you see a biological pattern repeat outside of biology this week?', domain_hint: 'Biology' },
  { id: 'historic_echo', prompt: 'Does a current event rhyme with something from history? Where does the analogy break?', domain_hint: 'History & Geopolitics' },
  { id: 'first_principles', prompt: 'Take one received idea from your field and decompose it to first principles. What holds up? What does not?', domain_hint: 'Philosophy' },
  { id: 'equilibrium', prompt: 'What looked stable this week but was in fact two opposing forces in balance?', domain_hint: 'Systems Thinking' },
  { id: 'mistake_anatomy', prompt: 'Describe a mistake you made — the cause, the consequence, the correction.', domain_hint: null },
  { id: 'small_experiment', prompt: 'What was the smallest experiment you ran this week, and what did it teach you?', domain_hint: null },
  { id: 'attention_ledger', prompt: 'Where did your attention go today that you do not want it to go tomorrow?', domain_hint: 'Cognitive Science' },
  { id: 'power_map', prompt: 'Who shapes your field without being visible? How did you notice their influence?', domain_hint: 'History & Geopolitics' },
  { id: 'math_sighting', prompt: 'Where did a mathematical structure appear in real life this week — even a simple one?', domain_hint: 'Mathematics' },
  { id: 'beauty_logged', prompt: 'What was beautiful today? Can you explain why in structural terms?', domain_hint: 'Art & Architecture' },
  { id: 'incentive_reading', prompt: 'Read someone’s incentive structure out loud. What would it predict that their stated beliefs do not?', domain_hint: 'Economics' },
  { id: 'unknown_known', prompt: 'What do you know you know but never articulate? Try one sentence.', domain_hint: null },
  { id: 'unknown_unknown', prompt: 'What question would a specialist in a distant field ask about your work that you have never asked?', domain_hint: 'Cross-Domain' },
  { id: 'time_horizon', prompt: 'At what time horizon do most of your decisions optimize? What horizon do you under-weight?', domain_hint: 'Systems Thinking' },
  { id: 'chemistry_sighting', prompt: 'Where did you witness a reaction today — physical, social, or emotional — worth naming?', domain_hint: 'Chemistry' },
  { id: 'physics_sighting', prompt: 'Describe something in your environment using forces, energy, or conservation laws.', domain_hint: 'Physics' },
  { id: 'identity_check', prompt: 'Which part of your self-image was reinforced today? Which part was quietly contradicted?', domain_hint: 'Psychology' },
  { id: 'leverage_audit', prompt: 'Where is the single highest-leverage action available to you this week?', domain_hint: null },
];

export function promptOfTheDay(seed: number = Date.now()): CommonplacePrompt {
  const index = Math.abs(Math.floor(seed / (1000 * 60 * 60 * 24))) % COMMONPLACE_PROMPTS.length;
  return COMMONPLACE_PROMPTS[index];
}
