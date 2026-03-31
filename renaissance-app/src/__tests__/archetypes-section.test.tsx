import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArchetypesSection } from '../components/Archetypes/ArchetypesSection';
import type { ArchetypeKey } from '../types';

function getSpotlightTitle(container: HTMLElement): string {
  const title = container.querySelector('.spotlight-shell h3');
  if (!title) {
    throw new Error('Spotlight title not found');
  }

  return title.textContent ?? '';
}

describe('ArchetypesSection', () => {
  it('syncs the spotlight when the active archetype prop changes', async () => {
    const { container, rerender } = render(
      <ArchetypesSection activeArchetype={'strategist' as ArchetypeKey} />,
    );

    expect(getSpotlightTitle(container)).toBe('The Strategist');

    rerender(<ArchetypesSection activeArchetype={'builder' as ArchetypeKey} />);

    await waitFor(() => {
      expect(getSpotlightTitle(container)).toBe('The Builder');
    });
  });
});
