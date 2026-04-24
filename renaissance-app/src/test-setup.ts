import '@testing-library/jest-dom';
import { beforeAll } from 'vitest';
import { ensureCardsLoaded } from './data/flashcards';

beforeAll(async () => {
  await ensureCardsLoaded();
});
