/* ==========================================================================
   PPCs of India — content protection
   --------------------------------------------------------------------------
   What this DOES block:

     * RIGHT CLICK / context menu, everywhere — this is the main route to
       "Save image as…" and "View page source" from the mouse. Long-press on
       touch devices (the mobile equivalent) is blocked too.
     * view-source and devtools keyboard shortcuts
       (Ctrl/Cmd+U, F12, Ctrl/Cmd+Shift+I/J/C/K, Cmd+Opt+I/J/U/C)
     * Ctrl/Cmd+S (save page)
     * text selection, copy, cut and drag of page content
     * dragging an image out of the page
     * click-through from a thumbnail to the bare .jpg file (it opens in an
       on-page overlay instead, so the watermark still covers it)

   What this deliberately does NOT block:

     * SCREENSHOTS — permitted. PrintScreen, Win+Shift+S and Cmd+Shift+3/4/5
       pass through, the clipboard is not scrubbed, and the page does not hide
       itself when the window loses focus.
     * Printing — enabled, since the screenshot restriction is lifted.
     * LEFT CLICK — completely untouched. Links, buttons, form fields,
       checkboxes, the nav and dropdowns, the theme toggle, the share menu and
       the lightbox all behave normally.
     * Ctrl/Cmd+F (find) — blocking it only frustrates readers and copies
       nothing.
     * Devtools *detection* (freezing the page, debugger loops). Those hurt
       ordinary visitors and assistive tech, and are trivially bypassed.

   IMPORTANT, please read: this is a deterrent, not a security control. Anyone
   determined can still obtain whatever their browser has downloaded — by
   disabling JavaScript, reading the network panel, or opening devtools from the
   browser's own menu (no web page can intercept that). With screenshots now
   allowed, casual copying of what is on screen is expressly possible. The real
   protections for your work remain the visible watermark, the copyright notice,
   and publishing at display rather than archive resolution.
   ========================================================================== */
(function () {
	'use strict';

	var doc = document;

	function block(e) {
		e.preventDefault();
		return false;
	}

	/** True when the node is (or sits inside) an editable field. */
	function inField(target) {
		return !!(target && target.closest &&
			target.closest('input,textarea,select,[contenteditable="true"]'));
	}

	/* ------------------------------------------------ right click / context */

	// Blocked everywhere: right click and touch long-press are how "Save image
	// as…" and "View page source" are reached from the pointer.
	doc.addEventListener('contextmenu', block);

	/* --------------------------------------------------- selection and copy
	   Left click itself is NOT interfered with — only the selection, copy and
	   drag that can follow it. */

	['selectstart', 'copy', 'cut', 'dragstart'].forEach(function (evt) {
		doc.addEventListener(evt, function (e) {
			// Form fields stay fully usable so the search boxes work.
			if (inField(e.target)) return;
			block(e);
		});
	});

	// Clear any stray selection the browser still managed to make.
	doc.addEventListener('mouseup', function (e) {
		if (inField(e.target)) return;
		if (window.getSelection) {
			var s = window.getSelection();
			if (s && s.type === 'Range') s.removeAllRanges();
		}
	});

	/* --------------------------------------------------------------- images */

	function hardenImages(root) {
		var imgs = (root || doc).querySelectorAll('img');
		for (var i = 0; i < imgs.length; i++) {
			var img = imgs[i];
			if (img.dataset.ppcProtected) continue;
			img.dataset.ppcProtected = '1';
			img.setAttribute('draggable', 'false');
			img.addEventListener('contextmenu', block);
			img.addEventListener('dragstart', block);
		}
	}

	/* ------------------------------------------------------------- keyboard
	   Only source-viewing, devtools and save-page are intercepted. Screenshot
	   and print keys are intentionally left alone. */

	function onKeyDown(e) {
		var k = (e.key || '').toLowerCase();
		var ctrl = e.ctrlKey || e.metaKey;

		// F12 — devtools
		if (e.key === 'F12') return block(e);

		// Ctrl/Cmd + Shift + I / J / C / K — devtools panes
		if (ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) {
			return block(e);
		}

		// macOS: Cmd + Option + I / J / U / C
		if (e.altKey && (e.metaKey || ctrl) &&
			(k === 'i' || k === 'j' || k === 'u' || k === 'c')) {
			return block(e);
		}

		if (ctrl) {
			// u = view-source, s = save page, a = select all, c = copy, x = cut.
			// Find (f/g) and print (p) are deliberately not touched.
			if (k === 'u' || k === 's' || k === 'a' || k === 'c' || k === 'x') {
				// Never swallow editing keys inside a text field.
				if (inField(e.target) && (k === 'a' || k === 'c' || k === 'x')) return;
				return block(e);
			}
		}
	}

	doc.addEventListener('keydown', onKeyDown, true);

	/* -------------------------------------------------- direct image links
	   Table thumbnails are wrapped in
	     <a href="...jpg" onclick="showImagePopup('...')">
	   but showImagePopup() is not defined anywhere in this codebase, so the
	   click threw and then fell through to the raw .jpg — handing over the
	   unwatermarked file. Define it, and show the image as an on-page overlay
	   so the foreground watermark still covers it. */

	function ensureImageOverlay() {
		var box = doc.getElementById('ppc-image-overlay');
		if (box) return box;

		box = doc.createElement('div');
		box.id = 'ppc-image-overlay';
		box.className = 'ppc-image-overlay';
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.setAttribute('aria-label', 'Image viewer');
		box.innerHTML =
			'<button type="button" class="ppc-image-overlay__close" ' +
			'aria-label="Close image viewer">&times;</button><img alt="">';
		doc.body.appendChild(box);

		var close = function () {
			box.removeAttribute('data-open');
			doc.body.style.overflow = '';
		};
		box.querySelector('.ppc-image-overlay__close').addEventListener('click', close);
		box.addEventListener('click', function (e) {
			if (e.target === box || e.target.tagName === 'IMG') close();
		});
		doc.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') close();
		});
		return box;
	}

	// Global because the inline onclick attributes call it by name.
	window.showImagePopup = function (src) {
		var box = ensureImageOverlay();
		var img = box.querySelector('img');
		// The attribute passes only a bare filename, so prefer the resolved
		// href of the link that was actually clicked.
		img.src = window.__ppcLastImageHref || src;
		img.alt = '';
		box.setAttribute('data-open', 'true');
		doc.body.style.overflow = 'hidden';
		return false;
	};

	// Capture the real href and cancel navigation to the bare image file.
	doc.addEventListener('click', function (e) {
		var a = e.target && e.target.closest ? e.target.closest('a') : null;
		if (!a) return;
		var href = a.getAttribute('href') || '';
		if (!/\.(jpe?g|png|gif|webp|avif)$/i.test(href)) return;
		window.__ppcLastImageHref = a.href;
		e.preventDefault();
		window.showImagePopup(a.href);
	}, true);

	/* ------------------------------------------------------------- bootstrap */

	function init() {
		hardenImages(doc);

		// Cover images added later (lightbox, share menu, dynamic rows).
		if (window.MutationObserver) {
			new MutationObserver(function (records) {
				for (var i = 0; i < records.length; i++) {
					var added = records[i].addedNodes;
					for (var j = 0; j < added.length; j++) {
						if (added[j].nodeType === 1) hardenImages(added[j]);
					}
				}
			}).observe(doc.body, { childList: true, subtree: true });
		}
	}

	if (doc.readyState === 'loading') {
		doc.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
