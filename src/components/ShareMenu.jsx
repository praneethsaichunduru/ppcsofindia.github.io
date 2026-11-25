import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icons } from './Icons.jsx';

/* The floating share button (ported from blog/share.js): share the page on WhatsApp or copy a short link.
   The message is "<page title>, <address line> - <short link>", as before. */

async function shorten(longUrl) {
  const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
  return response.text();
}

export default function ShareMenu() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const menu = useRef(null);
  const button = useRef(null);

  // Rebuild the message whenever the page changes.
  useEffect(() => {
    let cancelled = false;
    setMessage('');
    setOpen(false);
    (async () => {
      const cell = document.querySelector('.info-table tr:nth-child(3) td');
      const addressLine = cell ? cell.innerText.trim() : '';
      let shortUrl = window.location.href;
      try {
        shortUrl = await shorten(window.location.href);
      } catch (e) {
        /* offline: fall back to the full address */
      }
      if (!cancelled) setMessage(`${document.title}${addressLine ? ', ' + addressLine : ''} - ${shortUrl}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Close when clicking outside the menu.
  useEffect(() => {
    const onClick = (e) => {
      if (menu.current && !menu.current.contains(e.target) && e.target !== button.current) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const copy = (e) => {
    e.preventDefault();
    navigator.clipboard
      .writeText(message)
      .then(() => window.alert('Copied.'))
      .catch((err) => console.error('Failed to copy:', err));
  };

  return (
    <div className="share-menu">
      <button
        id="share-button"
        className="share-button"
        aria-label="Share this page"
        title="Share"
        ref={button}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      ></button>
      <div id="share-menu" className={'dropdown-content' + (open ? ' visible' : '')} ref={menu} onClick={(e) => e.stopPropagation()}>
        <a id="whatsappShare" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          <Icons.whatsapp /> WhatsApp
        </a>
        <a id="copyURL" href="#" onClick={copy}>
          <Icons.copy /> Copy URL
        </a>
      </div>
    </div>
  );
}
