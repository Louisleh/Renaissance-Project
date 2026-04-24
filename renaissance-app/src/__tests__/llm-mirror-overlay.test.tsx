import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LlmMirrorOverlay } from '../components/LlmMirror/LlmMirrorOverlay';
import { generateMirrorAnalysisPrompt } from '../lib/llm-mirror';

function renderOverlay() {
  return render(
    <MemoryRouter>
      <LlmMirrorOverlay isOpen onClose={vi.fn()} onComplete={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('LlmMirrorOverlay', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies the analysis prompt when the intro CTA is clicked', async () => {
    renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: /copy the analysis prompt/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(generateMirrorAnalysisPrompt());
    expect(
      await screen.findByRole('heading', { name: /copy the analysis prompt/i }),
    ).toBeInTheDocument();
  });
});
