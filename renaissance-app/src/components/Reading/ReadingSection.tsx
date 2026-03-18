import { useMemo } from 'react';
import { loadAssessmentResult } from '../../lib/data-sync';
import { useSubscription } from '../../contexts/SubscriptionContext';
import {
  getAmazonUrl,
  getBookshopUrl,
  readingRecommendations,
} from '../../data/reading-recommendations';
import type { AssessmentResult, DomainKey } from '../../types';
import './ReadingSection.css';

interface ReadingSectionProps {
  result?: AssessmentResult | null;
  title?: string;
  description?: string;
  maxItems?: number;
}

const defaultDomainOrder: DomainKey[] = [
  'strategy',
  'critical_thinking',
  'data_analysis',
  'leadership',
  'adaptability',
  'creativity',
  'problem_solving',
  'tech_proficiency',
];

function getLatestResult(result?: AssessmentResult | null): AssessmentResult | null {
  return result ?? loadAssessmentResult('deep_dive') ?? loadAssessmentResult('quick_pulse');
}

export function ReadingSection({
  result,
  title = 'Recommended Reading',
  description = 'Foundational books and essays to strengthen weak domains and expand cross-domain synthesis.',
  maxItems = 6,
}: ReadingSectionProps) {
  const { tier, hasAccess, openPricing } = useSubscription();

  const visibleBooks = useMemo(() => {
    const latestResult = getLatestResult(result);
    const domainOrder = tier === 'premium' && latestResult
      ? [...latestResult.growth_domains, ...defaultDomainOrder.filter((domain) => !latestResult.growth_domains.includes(domain))]
      : defaultDomainOrder;

    const sorted = [...readingRecommendations].sort((left, right) => {
      const leftIndex = domainOrder.indexOf(left.domain);
      const rightIndex = domainOrder.indexOf(right.domain);
      return leftIndex - rightIndex;
    });

    return sorted.slice(0, maxItems);
  }, [maxItems, result, tier]);

  const showLinks = hasAccess('curated_reading');
  const showDescriptions = hasAccess('curated_reading');
  const isPersonalized = hasAccess('personalized_reading');

  return (
    <section className="reading-section">
      <div className="reading-head">
        <div>
          <div className="console-kicker">{title}</div>
          <h3>{isPersonalized ? 'Personalized reading stack' : 'Curated reading list'}</h3>
        </div>
        <p>{description}</p>
      </div>

      <div className="reading-grid">
        {visibleBooks.map((book) => (
          <article key={`${book.domain}-${book.isbn}`} className="reading-card">
            <div className="reading-domain">{book.domain.replace('_', ' ')}</div>
            <h4>{book.title}</h4>
            <p className="reading-author">{book.author}</p>
            {showDescriptions ? (
              <p className="reading-description">{book.description}</p>
            ) : (
              <p className="reading-description is-muted">Upgrade to Pro for why this title matters and where it fits in your path.</p>
            )}

            {showLinks ? (
              <div className="reading-links">
                <a href={getAmazonUrl(book.isbn, book.affiliate_tag)} target="_blank" rel="noreferrer">
                  Amazon
                </a>
                <a href={getBookshopUrl(book.isbn, book.affiliate_tag)} target="_blank" rel="noreferrer">
                  Bookshop
                </a>
              </div>
            ) : (
              <button className="ghost-button reading-upgrade" onClick={openPricing}>
                See full reading list
              </button>
            )}
          </article>
        ))}
      </div>

      <p className="reading-disclosure">
        Some book links are affiliate links. If you purchase through them, Renaissance Skills may earn a commission at no extra cost to you.
      </p>
    </section>
  );
}
