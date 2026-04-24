import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AuthModal } from '../components/Auth/AuthModal';
import { LlmMirrorOverlay } from '../components/LlmMirror/LlmMirrorOverlay';
import { AuthProvider } from '../contexts/AuthContext';

expect.extend(toHaveNoViolations);

function wrap(children: React.ReactNode) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('a11y (jsdom)', () => {
  afterEach(() => {
    cleanup();
  });

  it('AuthModal open state has no axe violations', async () => {
    const { container } = render(wrap(<AuthModal isOpen onClose={() => undefined} />));
    const results = await axe(container, {
      rules: {
        // Dark-gold palette contrast is tracked as a separate design task.
        'color-contrast': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('LlmMirrorOverlay open state has no axe violations', async () => {
    const { container } = render(
      wrap(
        <LlmMirrorOverlay isOpen onClose={() => undefined} onComplete={() => undefined} />,
      ),
    );
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
