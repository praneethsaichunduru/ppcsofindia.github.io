/* Content protection, ported from data/ppc-protect.js.

   What it blocks: right click and long-press, text selection / copy / cut / drag of page content, dragging
   images out of the page, view-source / devtools / save-page keyboard shortcuts, and the click-through from a
   thumbnail to the bare .jpg (it opens in an on-page overlay instead, so the watermark still covers it).

   What it deliberately leaves alone: screenshots, printing, left click, find (Ctrl/Cmd+F), and form fields.
   It is a deterrent, not a security control. */

function block(e) {
  e.preventDefault();
  return false;
}

/** True when the node is (or sits inside) an editable field. */
function inField(target) {
  return !!(target && target.closest && target.closest('input,textarea,select,[contenteditable="true"]'));
}

function onKeyDown(e) {
  const k = (e.key || '').toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;

  if (e.key === 'F12') return block(e);
  if (ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) return block(e);
  if (e.altKey && (e.metaKey || ctrl) && (k === 'i' || k === 'j' || k === 'u' || k === 'c')) return block(e);

  if (ctrl && (k === 'u' || k === 's' || k === 'a' || k === 'c' || k === 'x')) {
    // Never swallow editing keys inside a text field.
    if (inField(e.target) && (k === 'a' || k === 'c' || k === 'x')) return undefined;
    return block(e);
  }
  return undefined;
}

/** Open the on-page image viewer (see ImageOverlay). */
export function showImage(src) {
  window.dispatchEvent(new CustomEvent('ppc:image', { detail: { src } }));
}

/** Install the protections; returns a function that removes them. */
export function installProtection() {
  const doc = document;
  const off = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    off.push(() => target.removeEventListener(type, fn, opts));
  };

  on(doc, 'contextmenu', block);
  ['selectstart', 'copy', 'cut', 'dragstart'].forEach((evt) => {
    on(doc, evt, (e) => {
      if (inField(e.target)) return; // form fields stay usable so the search boxes work
      block(e);
    });
  });

  // Clear any stray selection the browser still managed to make.
  on(doc, 'mouseup', (e) => {
    if (inField(e.target)) return;
    const s = window.getSelection && window.getSelection();
    if (s && s.type === 'Range') s.removeAllRanges();
  });

  on(doc, 'keydown', onKeyDown, true);

  // Links straight to a picture open in the overlay instead of handing over the bare file.
  on(
    doc,
    'click',
    (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!/\.(jpe?g|png|gif|webp|avif)$/i.test(href)) return;
      e.preventDefault();
      showImage(a.href);
    },
    true,
  );

  // Pictures cannot be dragged out of the page, including ones that appear later.
  const harden = (root) => {
    root.querySelectorAll('img').forEach((img) => {
      if (img.dataset.ppcProtected) return;
      img.dataset.ppcProtected = '1';
      img.setAttribute('draggable', 'false');
    });
  };
  harden(doc);
  let mo;
  if (window.MutationObserver) {
    mo = new MutationObserver((records) => {
      records.forEach((r) => r.addedNodes.forEach((n) => n.nodeType === 1 && (n.tagName === 'IMG' ? harden({ querySelectorAll: () => [n] }) : harden(n))));
    });
    mo.observe(doc.body, { childList: true, subtree: true });
  }

  return () => {
    off.forEach((f) => f());
    if (mo) mo.disconnect();
  };
}
