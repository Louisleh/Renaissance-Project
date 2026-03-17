import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Nav.css';

interface NavProps {
  onGetStarted: () => void;
}

export function Nav({ onGetStarted }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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
    { label: 'Home', href: '#home', to: '/' },
    { label: 'Assessment', href: '#assessment', to: '/#assessment' },
    { label: 'Development', href: '#development', to: '/#development' },
    { label: 'About', href: '#about', to: '/#about' },
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
                href={item.href}
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (isHome) scrollTo(item.href);
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          <button className="nav-cta" onClick={onGetStarted}>
            Get Started
          </button>

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
              href={item.href}
              className="mobile-menu-link"
              onClick={(e) => {
                e.preventDefault();
                closeMobile();
                setTimeout(() => scrollTo(item.href), 100);
              }}
            >
              {item.label}
            </a>
          ))}
          <button className="hero-button mobile-menu-cta" onClick={() => { closeMobile(); onGetStarted(); }}>
            Start Assessment
          </button>
        </div>
      </div>
    </>
  );
}
