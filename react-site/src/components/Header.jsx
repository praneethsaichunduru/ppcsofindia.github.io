import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from './Icons.jsx';
import { NAV, currentFile } from './nav.js';

const THEME_KEY = 'ppc-theme';

function effectiveTheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit) return explicit;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* private mode: the choice just lasts for this visit */
  }
  document.dispatchEvent(new CustomEvent('ppc:themechange', { detail: { theme } }));
}

export default function Header() {
  const { pathname } = useLocation();
  const current = currentFile(pathname);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  // Elevate the header once the page scrolls, and drive the reading-progress bar.
  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop;
      setScrolled(y > 4);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (y / max) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  // Close the menu on navigation, on a click outside it, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest || !e.target.closest('.ppc-header')) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className="ppc-header" data-menu={open ? 'open' : 'closed'} data-scrolled={scrolled ? 'true' : 'false'}>
      <div className="ppc-header__inner">
        <Link className="ppc-brand" to="/">
          <img src="/data/logo.png" alt="" width="46" height="46" decoding="async" />
          <span className="ppc-brand__text">
            <span className="ppc-brand__title">PPCs of India</span>
            <span className="ppc-brand__sub">Permanent Pictorial Cancellations</span>
          </span>
        </Link>
        <ul className="ppc-nav" id="ppc-primary-nav">
          {NAV.map((item) => {
            const Icon = Icons[item.icon];
            return (
              <li className="ppc-nav__item" key={item.to}>
                <Link className="ppc-nav__link" to={item.to} aria-current={item.file === current ? 'page' : undefined}>
                  <span className="ppc-nav__main">
                    <span className="ppc-nav__icon">
                      <Icon />
                    </span>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ppc-header__actions">
          <button
            type="button"
            className="ppc-icon-btn ppc-theme-toggle"
            aria-label="Switch between light and dark theme"
            title="Switch theme"
            onClick={() => applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark')}
          >
            <span className="ppc-icon--sun">
              <Icons.sun />
            </span>
            <span className="ppc-icon--moon">
              <Icons.moon />
            </span>
          </button>
          <button
            type="button"
            className="ppc-icon-btn ppc-burger"
            aria-label="Toggle navigation menu"
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="ppc-primary-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <span></span>
          </button>
        </div>
      </div>
      <div className="ppc-progress" style={{ width: progress ? progress + '%' : '0' }} />
    </header>
  );
}
