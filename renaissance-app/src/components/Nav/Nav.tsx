import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { trackCtaClick } from '../../lib/analytics';
import { UserMenu } from '../Auth/UserMenu';
import './Nav.css';

interface NavProps {
  onGetStarted: () => void;
  onOpenAuth: () => void;
}

export function Nav({ onGetStarted, onOpenAuth }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const { isAuthenticated, signOut, user } = useAuth();
  const { tier } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const navItems = [
    { label: 'Assessment', section: 'assessment', hash: '#assessment', to: '/#assessment' },
    { label: 'Archetypes', section: 'archetypes', hash: '#archetypes', to: '/#archetypes' },
    { label: 'Development', section: 'development', hash: '#development', to: '/#development' },
    { label: 'About', section: 'about', hash: '#about', to: '/#about' },
    { label: 'Pricing', section: 'pricing', hash: null, to: '/pricing' },
  ] as const;

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    document.body.style.overflow = '';
    window.setTimeout(() => lastFocusRef.current?.focus(), 0);
  }, []);

  const openMobile = useCallback(() => {
    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMobileOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const scrollTo = (hash: string) => {
    const el = document.querySelector(hash);
    if (!el) {
      return;
    }

    const top = el.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  useEffect(() => {
    if (location.pathname === '/pricing') {
      setActiveSection('pricing');
      return;
    }

    if (location.pathname === '/curriculum' || location.pathname === '/coaching' || location.pathname === '/history' || location.pathname === '/profile') {
      setActiveSection('development');
      return;
    }

    if (location.pathname !== '/') {
      setActiveSection('home');
      return;
    }

    const sections = ['home', 'assessment', 'archetypes', 'development', 'about'] as const;
    const hash = location.hash.replace('#', '');
    if (sections.includes(hash as (typeof sections)[number])) {
      setActiveSection(hash);
    }

    const observed = sections
      .map(section => document.getElementById(section))
      .filter((element): element is HTMLElement => Boolean(element));

    if (observed.length === 0) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      if (visible?.target instanceof HTMLElement) {
        setActiveSection(visible.target.id);
      }
    }, { threshold: [0.2, 0.35, 0.5], rootMargin: '-18% 0px -52% 0px' });

    observed.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const focusableSelector = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const focusables = mobileMenuRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      focusables?.[0]?.focus();
    };

    window.setTimeout(focusFirst, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobile();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusables = Array.from(mobileMenuRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter(element => !element.hasAttribute('disabled'));

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMobile, mobileOpen]);

  const isHome = location.pathname === '/';

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="nav-wrap">
        <nav className="container nav">
          <Link to="/" className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <span>Renaissance Skills</span>
          </Link>

          <div className="nav-links">
            {navItems.map(item => (
              <a
                key={item.label}
                href={item.hash ?? item.to}
                className={`nav-link${activeSection === item.section ? ' is-active' : ''}`}
                aria-current={activeSection === item.section ? (item.section === 'pricing' ? 'page' : 'location') : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.hash && isHome) {
                    scrollTo(item.hash);
                    return;
                  }

                  navigate(item.to);
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="nav-actions">
            {isAuthenticated && tier === 'free' && (
              <Link className="nav-upgrade-badge" to="/pricing">
                Upgrade
              </Link>
            )}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                className="nav-cta"
                onClick={() => {
                  void trackCtaClick('sign_in', 'nav', user?.id ?? null);
                  onOpenAuth();
                }}
              >
                Sign In
              </button>
            )}
          </div>

          <button
            className="mobile-toggle"
            onClick={openMobile}
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </nav>

        <div className="mobile-persistent-cta">
          <button
            className="mobile-persistent-cta-btn"
            onClick={() => {
              void trackCtaClick('start_assessment', 'mobile_persistent_nav', user?.id ?? null);
              onGetStarted();
            }}
          >
            Start Assessment
          </button>
        </div>
      </header>

      <div
        className={`mobile-menu ${mobileOpen ? 'is-open' : ''}`}
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="mobile-menu-header">
          <span className="brand">Renaissance Skills</span>
          <button className="mobile-menu-close" onClick={closeMobile} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mobile-menu-links">
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.hash ?? item.to}
              className={`mobile-menu-link${activeSection === item.section ? ' is-active' : ''}`}
              aria-current={activeSection === item.section ? (item.section === 'pricing' ? 'page' : 'location') : undefined}
              onClick={(e) => {
                e.preventDefault();
                closeMobile();
                if (item.hash && isHome) {
                  setTimeout(() => scrollTo(item.hash), 100);
                  return;
                }

                navigate(item.to);
              }}
            >
              {item.label}
            </a>
          ))}
          {isAuthenticated ? (
            <>
              <button
                className="mobile-menu-link mobile-menu-action"
                onClick={() => {
                  closeMobile();
                  navigate('/profile');
                }}
              >
                My Profile
              </button>
              <button
                className="mobile-menu-link mobile-menu-action"
                onClick={() => {
                  closeMobile();
                  navigate('/history');
                }}
              >
                Assessment History
              </button>
              <button
                className="hero-button mobile-menu-cta"
                onClick={async () => {
                  closeMobile();
                  await signOut();
                  navigate('/');
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                className="hero-button mobile-menu-cta"
                onClick={() => {
                  closeMobile();
                  void trackCtaClick('start_assessment', 'mobile_nav', user?.id ?? null);
                  onGetStarted();
                }}
              >
                Start Assessment
              </button>
              <button
                className="ghost-button mobile-menu-auth"
                onClick={() => {
                  closeMobile();
                  void trackCtaClick('sign_in', 'mobile_nav', user?.id ?? null);
                  onOpenAuth();
                }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
