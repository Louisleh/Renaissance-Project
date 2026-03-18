import { useState, useCallback } from 'react';
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
  const { isAuthenticated, signOut, user } = useAuth();
  const { tier } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    document.body.style.overflow = '';
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const isHome = location.pathname === '/';

  const navItems = [
    { label: 'Home', hash: '#home', to: '/' },
    { label: 'Assessment', hash: '#assessment', to: '/#assessment' },
    { label: 'Development', hash: '#development', to: '/#development' },
    { label: 'About', hash: '#about', to: '/#about' },
    { label: 'Pricing', hash: null, to: '/pricing' },
  ];

  const scrollTo = (hash: string) => {
    const el = document.querySelector(hash);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

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
                className="nav-link"
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
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileOpen ? 'is-open' : ''}`}>
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
              className="mobile-menu-link"
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
