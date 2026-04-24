import { Link } from 'react-router-dom';

interface Props {
  onDismiss: () => void;
}

export function WeeklyReviewBanner({ onDismiss }: Props) {
  return (
    <div className="weekly-review-banner">
      <div className="weekly-review-banner-text">
        <span className="weekly-review-eyebrow">Weekly Review</span>
        <h3 className="weekly-review-title">Close out the week.</h3>
        <p className="weekly-review-copy">
          Twenty minutes with the arc of the week in view: what you reviewed, what you wrote, what is drifting.
        </p>
      </div>
      <div className="weekly-review-banner-actions">
        <Link className="hero-button" to="/review">
          Open weekly review
        </Link>
        <button type="button" className="ghost-button" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
