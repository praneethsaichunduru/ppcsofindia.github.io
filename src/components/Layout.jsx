import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { ImageOverlay, Lightbox } from './Viewers.jsx';
import { installProtection } from './protect.js';
import { Icons } from './Icons.jsx';

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible((window.pageYOffset || document.documentElement.scrollTop) > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      type="button"
      className="ppc-to-top"
      aria-label="Back to top"
      data-visible={visible ? 'true' : 'false'}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <Icons.arrowUp />
    </button>
  );
}

/** Everything that stays the same from page to page: header, footer, viewers, protection, analytics. */
export default function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => installProtection(), []);

  // A new page starts at the top (unless the address points at a place in it); count it as a page view.
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    if (!first && typeof window.gtag === 'function')
      window.gtag('event', 'page_view', { page_path: pathname, page_location: window.location.href, page_title: document.title });
    setFirst(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <a className="ppc-skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Outlet />
      <Footer />
      <BackToTop />
      <Lightbox routeKey={pathname} />
      <ImageOverlay />
    </>
  );
}
