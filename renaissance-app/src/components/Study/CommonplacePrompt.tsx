import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  appendCommonplaceEntry,
  promptOfTheDay,
  type CommonplacePrompt as PromptType,
} from '../../lib/progression/commonplace';
import { trackCommonplaceSubmitted } from '../../lib/analytics';

interface Props {
  prompt?: PromptType;
}

export function CommonplacePrompt({ prompt }: Props) {
  const { user } = useAuth();
  const active = prompt ?? promptOfTheDay();
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    await appendCommonplaceEntry(
      {
        prompt_id: active.id,
        prompt_text: active.prompt,
        body: trimmed,
        domain_hint: active.domain_hint,
      },
      user?.id ?? null,
    );
    void trackCommonplaceSubmitted(active.id, trimmed.length, active.domain_hint, user?.id ?? null);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="commonplace-card commonplace-submitted">
        <span className="commonplace-eyebrow">Commonplace</span>
        <p className="commonplace-thankyou">Entry saved. Come back tomorrow for a new prompt.</p>
      </div>
    );
  }

  return (
    <div className="commonplace-card">
      <div className="commonplace-header">
        <span className="commonplace-eyebrow">Commonplace</span>
        {active.domain_hint && <span className="commonplace-domain">{active.domain_hint}</span>}
      </div>
      <p className="commonplace-prompt-text">{active.prompt}</p>
      <textarea
        className="commonplace-textarea"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        placeholder="One or two sentences is enough."
        maxLength={1500}
      />
      <div className="commonplace-footer">
        <span className="commonplace-count">{body.length}/1500</span>
        <button
          className="hero-button commonplace-submit"
          type="button"
          onClick={() => void handleSubmit()}
          disabled={body.trim().length === 0 || submitting}
        >
          {submitting ? 'Saving…' : 'Save to commonplace'}
        </button>
      </div>
    </div>
  );
}
