/* ==========================================================================
   PPCs of India — gallery lightbox
   --------------------------------------------------------------------------
   Click any image inside .overview-images to view it full size. Purely
   additive: no markup changes are needed on the article pages, and it degrades
   to a plain image if JavaScript is unavailable.
   ========================================================================== */
(function () {
	'use strict';

	function init() {
		var images = document.querySelectorAll('.overview-images img');
		if (!images.length) return;

		var box = document.createElement('div');
		box.className = 'ppc-lightbox';
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.setAttribute('aria-label', 'Image viewer');
		box.innerHTML =
			'<button type="button" class="ppc-lightbox__close" aria-label="Close image viewer">&times;</button>' +
			'<img alt="">' +
			'<p class="ppc-lightbox__caption"></p>';
		document.body.appendChild(box);

		var full = box.querySelector('img');
		var caption = box.querySelector('.ppc-lightbox__caption');
		var closeBtn = box.querySelector('.ppc-lightbox__close');
		var lastFocus = null;

		function open(src, alt, credit) {
			lastFocus = document.activeElement;
			full.src = src;
			full.alt = alt || '';
			caption.textContent = credit || alt || '';
			box.setAttribute('data-open', 'true');
			document.body.style.overflow = 'hidden';
			closeBtn.focus();
		}

		function close() {
			box.setAttribute('data-open', 'false');
			document.body.style.overflow = '';
			// Release the (potentially large) image from memory.
			window.setTimeout(function () {
				if (box.getAttribute('data-open') !== 'true') full.removeAttribute('src');
			}, 250);
			if (lastFocus && lastFocus.focus) lastFocus.focus();
		}

		for (var i = 0; i < images.length; i++) {
			(function (img) {
				img.setAttribute('tabindex', '0');
				img.setAttribute('role', 'button');

				var activate = function () {
					// A sibling .credits paragraph, if the page provides one.
					var credit = '';
					var holder = img.parentNode;
					if (holder) {
						var c = holder.querySelector('.credits');
						if (c) credit = c.textContent.trim();
					}
					open(img.currentSrc || img.src, img.alt, credit);
				};

				img.addEventListener('click', activate);
				img.addEventListener('keydown', function (e) {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						activate();
					}
				});
			})(images[i]);
		}

		closeBtn.addEventListener('click', close);
		box.addEventListener('click', function (e) {
			// Click the backdrop or the image itself to dismiss.
			if (e.target === box || e.target === full) close();
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && box.getAttribute('data-open') === 'true') close();
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
