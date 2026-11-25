import { useCallback, useEffect, useRef, useState } from 'react';

/* Two full-size picture viewers, ported from data/ppc-protect.js and data/ppc-lightbox.js.

   ImageOverlay  - opens when a link to a picture is clicked (the list's thumbnails), via showImage().
   Lightbox       - opens when a picture inside an ".overview-images" gallery is clicked or activated by keyboard. */

export function ImageOverlay() {
  const [src, setSrc] = useState('');
  const open = !!src;
  const close = useCallback(() => setSrc(''), []);

  useEffect(() => {
    const onImage = (e) => setSrc(e.detail.src);
    const onKey = (e) => e.key === 'Escape' && setSrc('');
    window.addEventListener('ppc:image', onImage);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('ppc:image', onImage);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div
      id="ppc-image-overlay"
      className="ppc-image-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      data-open={open ? 'true' : undefined}
      onClick={(e) => (e.target === e.currentTarget || e.target.tagName === 'IMG') && close()}
    >
      <button type="button" className="ppc-image-overlay__close" aria-label="Close image viewer" onClick={close}>
        &times;
      </button>
      <img alt="" src={src || undefined} />
    </div>
  );
}

export function Lightbox({ routeKey }) {
  const [shot, setShot] = useState(null); // { src, alt, caption }
  const lastFocus = useRef(null);
  const closeBtn = useRef(null);
  const open = !!shot;

  const close = useCallback(() => {
    setShot(null);
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus();
  }, []);

  const activate = useCallback((img) => {
    lastFocus.current = document.activeElement;
    const holder = img.parentNode;
    const c = holder && holder.querySelector('.credits');
    const credit = c ? c.textContent.trim() : '';
    setShot({ src: img.currentSrc || img.src, alt: img.alt, caption: credit || img.alt || '' });
  }, []);

  // Pictures in a gallery become buttons (keyboard users can open them too).
  useEffect(() => {
    document.querySelectorAll('.overview-images img').forEach((img) => {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
    });
  }, [routeKey]);

  useEffect(() => {
    const onClick = (e) => {
      const img = e.target && e.target.closest ? e.target.closest('.overview-images img') : null;
      if (img && !img.closest('a')) activate(img);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') return close();
      const img = e.target && e.target.closest ? e.target.closest('.overview-images img') : null;
      if (img && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        activate(img);
      }
      return undefined;
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [activate, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && closeBtn.current) closeBtn.current.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div
      className="ppc-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      data-open={open ? 'true' : 'false'}
      onClick={(e) => (e.target === e.currentTarget || e.target.tagName === 'IMG') && close()}
    >
      <button type="button" className="ppc-lightbox__close" aria-label="Close image viewer" onClick={close} ref={closeBtn}>
        &times;
      </button>
      <img alt={shot ? shot.alt : ''} src={shot ? shot.src : undefined} />
      <p className="ppc-lightbox__caption">{shot ? shot.caption : ''}</p>
    </div>
  );
}
