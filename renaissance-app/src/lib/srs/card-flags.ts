import { safeRead, safeWrite, safeRemove } from '../safe-local-storage';
import type { CardFlag, CardFlagStatus } from '../../types/cards';

export const CARD_FLAGS_KEY = 'renaissance_card_flags';

type FlagsMap = Record<string, CardFlag>;

function read(): FlagsMap {
  return safeRead<FlagsMap>(CARD_FLAGS_KEY) ?? {};
}

function write(flags: FlagsMap): boolean {
  return safeWrite(CARD_FLAGS_KEY, flags);
}

export function loadCardFlags(): FlagsMap {
  return read();
}

export function getCardFlag(cardId: string): CardFlag | null {
  return read()[cardId] ?? null;
}

export function setCardFlag(
  cardId: string,
  status: CardFlagStatus,
  options: { reason?: string; buryDays?: number } = {},
): CardFlag {
  const flags = read();
  const now = new Date();
  const buryUntil =
    status === 'buried' && options.buryDays
      ? new Date(now.getTime() + options.buryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
  const flag: CardFlag = {
    card_id: cardId,
    status,
    reason: options.reason ?? null,
    flagged_at: now.toISOString(),
    bury_until: buryUntil,
  };
  flags[cardId] = flag;
  write(flags);
  return flag;
}

export function clearCardFlag(cardId: string): void {
  const flags = read();
  delete flags[cardId];
  write(flags);
}

export function isCardActive(cardId: string, now: Date = new Date()): boolean {
  const flag = read()[cardId];
  if (!flag) return true;
  if (flag.status === 'suspended' || flag.status === 'reported') return false;
  if (flag.status === 'buried' && flag.bury_until) {
    return new Date(flag.bury_until).getTime() <= now.getTime();
  }
  return true;
}

export function clearLocalCardFlags(): void {
  safeRemove(CARD_FLAGS_KEY);
}
