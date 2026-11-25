/* ==========================================================================
   Compatibility shim.
   --------------------------------------------------------------------------
   The navbar/footer used to be injected here with fetch(), which the browser
   blocks on file:// URLs — that is why the header and footer disappeared when
   the site was opened locally. The chrome now ships as Web Components in
   data/ppc-chrome.js, which needs no network request at all.

   This file is kept only so that pages still pointing at it do not 404. It
   loads the real chrome script, resolving the site root from its own <script>
   src, then does nothing else.
   ========================================================================== */
(function () {
	'use strict';

	if (window.__ppcChromeRequested) return;
	window.__ppcChromeRequested = true;

	// Already loaded by the page itself? Nothing to do.
	if (document.querySelector('script[src$="data/ppc-chrome.js"]')) return;

	function root() {
		var declared = document.documentElement.getAttribute('data-ppc-root');
		if (declared !== null) return declared;

		var self = document.currentScript;
		if (!self) {
			var all = document.getElementsByTagName('script');
			for (var i = all.length - 1; i >= 0; i--) {
				if ((all[i].src || '').indexOf('loadNavbarFooter.js') !== -1) {
					self = all[i];
					break;
				}
			}
		}
		if (self) {
			var src = self.getAttribute('src') || '';
			var cut = src.lastIndexOf('loadNavbarFooter.js');
			if (cut !== -1) return src.slice(0, cut);
		}
		return '';
	}

	var s = document.createElement('script');
	s.src = root() + 'data/ppc-chrome.js';
	s.defer = true;
	document.head.appendChild(s);
})();
