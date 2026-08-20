/* ==========================================================================
   PPCs of India — site chrome as Web Components
   --------------------------------------------------------------------------
   Replaces the old fetch()-based loadNavbarFooter.js.

   Why: fetch() on a file:// URL is blocked by the browser's CORS rules, so the
   navbar and footer silently vanished when the site was opened locally. The
   markup now ships inside this script and is rendered by custom elements, so
   the chrome appears identically on file://, GitHub Pages and any web server.

   Usage — one line in <head>, two tags in <body>:
     <script src="<root>data/ppc-chrome.js" defer></script>
     <ppc-header></ppc-header> ... <ppc-footer></ppc-footer>

   The script works out how deep the current page sits and rewrites every
   internal link and asset path accordingly, so the same markup serves pages at
   the site root and pages two folders down under /blog/<state>/.
   ========================================================================== */
(function () {
	'use strict';

	/* ---------------------------------------------------------------- utils */

	/** Resolve the site root as a prefix ('', '../', '../../') for this page. */
	function resolveRoot() {
		// An explicit override always wins: <html data-ppc-root="../../">
		var declared = document.documentElement.getAttribute('data-ppc-root');
		if (declared !== null) return declared;

		// Otherwise derive it from the path of this very script tag.
		var self =
			document.currentScript ||
			(function () {
				var all = document.getElementsByTagName('script');
				for (var i = all.length - 1; i >= 0; i--) {
					if ((all[i].src || '').indexOf('ppc-chrome.js') !== -1) return all[i];
				}
				return null;
			})();

		if (self) {
			var src = self.getAttribute('src') || '';
			// '../../data/ppc-chrome.js' -> '../../'
			var cut = src.lastIndexOf('data/ppc-chrome.js');
			if (cut !== -1) return src.slice(0, cut);
		}
		return '';
	}

	var ROOT = resolveRoot();

	/** Prefix a site-relative path with the resolved root. */
	function url(path) {
		return ROOT + path;
	}

	var LOGO = url('data/logo.png');

	/* ------------------------------------------------------- navigation data */

	var NAV = [
		{ label: 'Index', href: 'index.html' },
		{ label: 'PPC List', href: 'list-pincode.html' },
		{ label: 'Know About PPCs', href: 'blog/blog-main.html' },
		{ label: 'Stamp Maps', href: 'stamp-maps.html' },
		{
			label: 'Special Cancellations',
			children: [
				{ label: 'Home', href: 'special-cancellations.html' },
				{ label: '2023', href: 'special-cancellations-2023.html' },
				{ label: '2024', href: 'special-cancellations-2024.html' },
				{ label: '2025', href: 'special-cancellations-2025.html' }
			]
		},
		{ label: 'How to Collect?', href: 'how-to-collect.html' },
		{ label: 'Address', href: 'address.html' },
		{ label: 'Contact', href: 'contact.html' }
	];

	/** Current page filename, for marking the active nav item. */
	var CURRENT = (function () {
		var parts = window.location.pathname.split('/');
		var file = parts[parts.length - 1];
		return file === '' ? 'index.html' : decodeURIComponent(file);
	})();

	function isActive(href) {
		if (!href) return false;
		var target = href.split('/').pop();
		return target === CURRENT;
	}

	/* --------------------------------------------------------------- theming */

	var THEME_KEY = 'ppc-theme';

	function storedTheme() {
		try {
			return window.localStorage.getItem(THEME_KEY);
		} catch (e) {
			return null; // private mode / file:// restrictions
		}
	}

	function applyTheme(theme) {
		if (theme === 'light' || theme === 'dark') {
			document.documentElement.setAttribute('data-theme', theme);
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
		try {
			if (theme) window.localStorage.setItem(THEME_KEY, theme);
			else window.localStorage.removeItem(THEME_KEY);
		} catch (e) {
			/* non-fatal */
		}
		document.dispatchEvent(new CustomEvent('ppc:themechange', { detail: { theme: theme } }));
	}

	function effectiveTheme() {
		var explicit = document.documentElement.getAttribute('data-theme');
		if (explicit) return explicit;
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
	}

	// Apply the saved theme as early as possible to avoid a flash of the wrong one.
	applyTheme(storedTheme());

	/* ----------------------------------------------------------- icon sprites */

	var ICONS = {
		sun:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
			'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
		moon:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			'<path d="M20.5 14.4A8.6 8.6 0 1 1 9.6 3.5a7 7 0 0 0 10.9 10.9Z"/></svg>',
		chevron:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			'<path d="m6 9 6 6 6-6"/></svg>',
		arrowUp:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			'<path d="M12 19V5M5 12l7-7 7 7"/></svg>',
		mail:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			'<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6.5 9 6 9-6"/></svg>'
	};

	/* ------------------------------------------------------- shared stylesheet
	   Injected once into <head>. The components deliberately do NOT use shadow
	   DOM so that the site's design tokens in theme.css cascade into them. */

	var CHROME_CSS =
		'ppc-header,ppc-footer{display:block;width:100%;}' +
		':root{--ppc-share-icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Ccircle cx=%2718%27 cy=%275%27 r=%273%27/%3E%3Ccircle cx=%276%27 cy=%2712%27 r=%273%27/%3E%3Ccircle cx=%2718%27 cy=%2719%27 r=%273%27/%3E%3Cpath d=%27m8.6 13.5 6.8 4M15.4 6.5l-6.8 4%27/%3E%3C/svg%3E");}' +
		/* ---- header shell ---- */
		'.ppc-header{display:block;position:sticky;top:0;z-index:1000;background:var(--surface-header);' +
		'backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);' +
		'border-bottom:1px solid var(--border);transition:box-shadow .25s var(--ease),background-color .25s var(--ease);}' +
		'.ppc-header[data-scrolled="true"]{box-shadow:var(--shadow-md);}' +
		'@supports not (backdrop-filter:blur(2px)){.ppc-header{background:var(--surface-card);}}' +
		'.ppc-header__inner{max-width:1560px;margin-inline:auto;padding:0 clamp(var(--space-4),3vw,var(--space-6));' +
		'min-height:var(--header-height);display:flex;align-items:center;gap:var(--space-4);min-width:0;}' +
		/* ---- brand ---- */
		'.ppc-brand{display:flex;align-items:center;gap:var(--space-3);text-decoration:none;color:var(--text-strong);' +
		'flex:none;min-width:0;padding-block:var(--space-2);margin-right:auto;}' +
		'.ppc-brand:hover{text-decoration:none;color:var(--text-strong);}' +
		'.ppc-brand img{width:46px;height:46px;border:0;border-radius:50%;flex:none;box-shadow:var(--shadow-xs);' +
		'transition:transform .3s var(--ease);}' +
		'.ppc-brand:hover img{transform:rotate(-8deg) scale(1.05);}' +
		'.ppc-brand__text{display:flex;flex-direction:column;line-height:1.15;min-width:0;overflow:hidden;}' +
		'.ppc-brand__title{font-family:var(--font-display);font-weight:700;font-size:1rem;letter-spacing:-.01em;' +
		'color:var(--text-strong);white-space:nowrap;}' +
		'.ppc-brand__sub{font-size:.68rem;text-transform:uppercase;letter-spacing:.14em;color:var(--text-muted);' +
		'font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
		/* ---- desktop nav ---- */
		'.ppc-nav{display:flex;align-items:center;gap:var(--space-1);list-style:none;margin:0;padding:0;min-width:0;flex-wrap:nowrap;justify-content:flex-end;flex:none;}' +
		'.ppc-nav__item{position:relative;}' +
		'.ppc-nav__link{display:inline-flex;align-items:center;gap:var(--space-1);padding:.5rem .7rem;border-radius:var(--radius-sm);' +
		'font-size:.86rem;font-weight:500;color:var(--text-body);text-decoration:none;white-space:nowrap;' +
		'background:none;border:0;cursor:pointer;font-family:var(--font-body);' +
		'transition:color .16s var(--ease),background-color .16s var(--ease);}' +
		'.ppc-nav__link:hover{color:var(--text-strong);background:var(--surface-sunken);text-decoration:none;}' +
		'.ppc-nav__link[aria-current="page"]{color:var(--accent);font-weight:600;}' +
		'.ppc-nav__link[aria-current="page"]::after{content:"";position:absolute;left:.7rem;right:.7rem;bottom:-2px;' +
		'height:2px;border-radius:2px;background:var(--accent);}' +
		'.ppc-nav__link svg{width:14px;height:14px;transition:transform .2s var(--ease);}' +
		'.ppc-nav__item[data-open="true"] .ppc-nav__link svg{transform:rotate(180deg);}' +
		/* ---- dropdown ---- */
		'.ppc-dropdown{position:absolute;top:calc(100% + 8px);left:0;min-width:190px;padding:var(--space-2);margin:0;' +
		'list-style:none;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-md);' +
		'box-shadow:var(--shadow-lg);opacity:0;visibility:hidden;transform:translateY(-6px);' +
		'transition:opacity .18s var(--ease),transform .18s var(--ease),visibility .18s;}' +
		'.ppc-nav__item[data-open="true"] .ppc-dropdown{opacity:1;visibility:visible;transform:translateY(0);}' +
		'.ppc-dropdown a{display:block;padding:.5rem .7rem;border-radius:var(--radius-sm);font-size:.86rem;' +
		'color:var(--text-body);text-decoration:none;transition:background-color .15s var(--ease),color .15s var(--ease);}' +
		'.ppc-dropdown a:hover{background:var(--surface-sunken);color:var(--text-strong);text-decoration:none;}' +
		'.ppc-dropdown a[aria-current="page"]{color:var(--accent);font-weight:600;}' +
		/* ---- header actions ---- */
		'.ppc-header__actions{display:flex;align-items:center;gap:var(--space-2);flex:none;margin-left:auto;}' +
		'.ppc-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;' +
		'background:transparent;color:var(--text-body);border:1px solid var(--border);border-radius:var(--radius-sm);' +
		'cursor:pointer;transition:background-color .16s var(--ease),color .16s var(--ease),border-color .16s var(--ease);}' +
		'.ppc-icon-btn:hover{background:var(--surface-sunken);color:var(--text-strong);border-color:var(--border-strong);}' +
		'.ppc-icon-btn svg{width:18px;height:18px;}' +
		'.ppc-theme-toggle .ppc-icon--moon{display:none;}' +
		':root[data-theme="dark"] .ppc-theme-toggle .ppc-icon--moon{display:block;}' +
		':root[data-theme="dark"] .ppc-theme-toggle .ppc-icon--sun{display:none;}' +
		'@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .ppc-theme-toggle .ppc-icon--moon{display:block;}' +
		':root:not([data-theme="light"]):not([data-theme="dark"]) .ppc-theme-toggle .ppc-icon--sun{display:none;}}' +
		/* ---- burger ---- */
		'.ppc-burger{display:none;}' +
		'.ppc-burger span{display:block;width:18px;height:2px;background:currentColor;border-radius:2px;position:relative;' +
		'transition:transform .22s var(--ease),opacity .22s var(--ease);}' +
		'.ppc-burger span::before,.ppc-burger span::after{content:"";position:absolute;left:0;width:18px;height:2px;' +
		'background:currentColor;border-radius:2px;transition:transform .22s var(--ease);}' +
		'.ppc-burger span::before{top:-6px;}.ppc-burger span::after{top:6px;}' +
		'.ppc-burger[aria-expanded="true"] span{background:transparent;}' +
		'.ppc-burger[aria-expanded="true"] span::before{transform:translateY(6px) rotate(45deg);}' +
		'.ppc-burger[aria-expanded="true"] span::after{transform:translateY(-6px) rotate(-45deg);}' +
		/* ---- progress bar ---- */
		'.ppc-progress{position:absolute;left:0;bottom:-1px;height:2px;width:0;background:linear-gradient(90deg,' +
		'var(--ppc-saffron),var(--accent),var(--ppc-green));transition:width .1s linear;}' +
		/* ---- mobile ---- */
		'@media (max-width:1439px){.ppc-brand__sub{display:none;}}' +
		'@media (max-width:1340px) and (min-width:1200px){.ppc-nav__link{padding:.5rem .55rem;font-size:.82rem;}}' +
		'@media (max-width:1199px){' +
		'.ppc-burger{display:inline-flex;}' +
		'.ppc-nav{position:fixed;inset:var(--header-height) 0 auto 0;flex-direction:column;align-items:stretch;gap:0;' +
		'background:var(--surface-card);border-bottom:1px solid var(--border);box-shadow:var(--shadow-lg);' +
		'padding:var(--space-3) clamp(var(--space-4),5vw,var(--space-6)) var(--space-5);' +
		'max-height:calc(100vh - var(--header-height));overflow-y:auto;' +
		'transform:translateY(-8px);opacity:0;visibility:hidden;pointer-events:none;' +
		'transition:opacity .2s var(--ease),transform .2s var(--ease),visibility .2s;}' +
		'.ppc-header[data-menu="open"] .ppc-nav{opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto;}' +
		'.ppc-nav__link{width:100%;justify-content:space-between;padding:.8rem .4rem;font-size:.95rem;border-radius:var(--radius-sm);}' +
		'.ppc-nav__link[aria-current="page"]::after{display:none;}' +
		'.ppc-nav__item+.ppc-nav__item{border-top:1px solid var(--border);}' +
		'.ppc-dropdown{position:static;min-width:0;opacity:1;visibility:visible;transform:none;box-shadow:none;' +
		'border:0;border-radius:0;padding:0 0 var(--space-2) var(--space-4);display:none;background:transparent;}' +
		'.ppc-nav__item[data-open="true"] .ppc-dropdown{display:block;}' +
		'.ppc-dropdown a{padding:.6rem .4rem;}' +
		'.ppc-brand__sub{display:none;}' +
		'}' +
		'@media (max-width:420px){.ppc-brand__title{font-size:.88rem;white-space:normal;}.ppc-brand img{width:38px;height:38px;}}' +
		/* ---- footer ---- */
		'.ppc-footer{display:block;position:relative;z-index:2;margin-top:auto;background:var(--surface-inverse);color:var(--text-on-dark);' +
		'padding:clamp(var(--space-6),5vw,var(--space-7)) 0 var(--space-5);' +
		/* A hard top edge plus a lifted shadow keeps the footer a distinct band
		   rather than blending into the page background. */
		'border-top:1px solid var(--border);box-shadow:0 -1px 0 rgba(0,0,0,.06),0 -12px 28px -18px rgba(0,0,0,.35);}' +
		'.ppc-footer__inner{max-width:var(--content-max);margin-inline:auto;padding-inline:clamp(var(--space-4),4vw,var(--space-6));min-width:0;}' +
		'.ppc-footer__grid{display:grid;gap:var(--space-6);grid-template-columns:1fr;padding-bottom:var(--space-6);}' +
		'@media (min-width:560px){.ppc-footer__grid{grid-template-columns:repeat(2,minmax(0,1fr));}}' +
		'@media (min-width:900px){.ppc-footer__grid{grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));}}' +
		'.ppc-footer__grid>*{min-width:0;}' +
		'.ppc-footer__brand{display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);' +
		'text-decoration:none;color:var(--text-on-dark);}' +
		'.ppc-footer__brand:hover{color:#fff;text-decoration:none;}' +
		'.ppc-footer__brand img{width:52px;height:52px;border:0;border-radius:50%;background:#fff;padding:3px;flex:none;}' +
		'.ppc-footer__brand span{font-family:var(--font-display);font-weight:700;font-size:1.02rem;line-height:1.25;}' +
		'.ppc-footer__blurb{color:var(--text-on-dark-muted);font-size:var(--step--1);max-width:42ch;margin:0;min-width:0;}' +
		'.ppc-footer h2{font-family:var(--font-body);font-size:.72rem;font-weight:600;text-transform:uppercase;' +
		'letter-spacing:.14em;color:var(--text-on-dark-muted);margin:0 0 var(--space-3);}' +
		'.ppc-footer ul{list-style:none;margin:0;padding:0;}' +
		'.ppc-footer li{margin-bottom:var(--space-2);}' +
		'.ppc-footer a{color:var(--text-on-dark);font-size:var(--step--1);text-decoration:none;' +
		'transition:color .16s var(--ease);}' +
		'.ppc-footer a:hover{color:var(--ppc-saffron);text-decoration:none;}' +
		'.ppc-footer__contact a{display:inline-flex;align-items:center;gap:var(--space-2);}' +
		'.ppc-footer__contact svg{width:15px;height:15px;flex:none;}' +
		'.ppc-footer__bar{border-top:1px solid rgba(255,255,255,.13);padding-top:var(--space-4);display:flex;' +
		'flex-wrap:wrap;gap:var(--space-3) var(--space-5);align-items:center;justify-content:space-between;}' +
		'.ppc-footer__bar p{margin:0;font-size:var(--step--1);color:var(--text-on-dark-muted);}' +
		'.ppc-footer__bar a{color:var(--text-on-dark-muted);}' +
		'.ppc-footer__bar a:hover{color:var(--ppc-saffron);}' +
		'.ppc-footer__rule{height:3px;border-radius:3px;background:linear-gradient(90deg,var(--ppc-saffron) 0 33%,' +
		'#f4f6f8 33% 66%,var(--ppc-green) 66%);margin-bottom:clamp(var(--space-5),4vw,var(--space-6));opacity:.85;}' +
		/* ---- back to top ---- */
		'.ppc-to-top{position:fixed;right:var(--space-5);bottom:calc(var(--space-5) + 60px);z-index:899;' +
		'display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;padding:0;' +
		'background:var(--surface-card);color:var(--text-strong);border:1px solid var(--border-strong);' +
		'border-radius:50%;cursor:pointer;box-shadow:var(--shadow-md);opacity:0;visibility:hidden;' +
		'transform:translateY(8px);transition:opacity .22s var(--ease),transform .22s var(--ease),visibility .22s,' +
		'background-color .18s var(--ease),color .18s var(--ease);}' +
		'.ppc-to-top[data-visible="true"]{opacity:1;visibility:visible;transform:translateY(0);}' +
		'.ppc-to-top:hover{background:var(--accent);color:var(--accent-contrast);border-color:var(--accent);}' +
		'.ppc-to-top svg{width:18px;height:18px;}';

	function injectStyles() {
		if (document.getElementById('ppc-chrome-styles')) return;
		var style = document.createElement('style');
		style.id = 'ppc-chrome-styles';
		style.textContent = CHROME_CSS;
		document.head.appendChild(style);
	}

	/** Point the CSS watermark at the main site logo.
	 *  The value is consumed by a url() inside data/theme.css, so a relative
	 *  path would resolve against the stylesheet's folder (producing
	 *  data/data/logo.png). Resolve to an absolute URL first. */
	function setWatermark() {
		var abs = LOGO;
		try {
			abs = new URL(LOGO, document.baseURI).href;
		} catch (e) {
			/* very old browser — fall back to the relative path */
		}
		document.documentElement.style.setProperty('--ppc-watermark', "url('" + abs + "')");
	}

	injectStyles();
	setWatermark();

	/* ------------------------------------------------------------ <ppc-header> */

	function buildNavItem(item) {
		var li = document.createElement('li');
		li.className = 'ppc-nav__item';

		if (item.children) {
			var anyChildActive = item.children.some(function (c) {
				return isActive(c.href);
			});

			var btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'ppc-nav__link';
			btn.setAttribute('aria-expanded', 'false');
			btn.setAttribute('aria-haspopup', 'true');
			btn.innerHTML = escapeHTML(item.label) + ICONS.chevron;
			if (anyChildActive) btn.setAttribute('aria-current', 'page');

			var menu = document.createElement('ul');
			menu.className = 'ppc-dropdown';
			item.children.forEach(function (child) {
				var cli = document.createElement('li');
				var a = document.createElement('a');
				a.href = url(child.href);
				a.textContent = child.label;
				if (isActive(child.href)) a.setAttribute('aria-current', 'page');
				cli.appendChild(a);
				menu.appendChild(cli);
			});

			li.appendChild(btn);
			li.appendChild(menu);

			var toggle = function (open) {
				li.setAttribute('data-open', open ? 'true' : 'false');
				btn.setAttribute('aria-expanded', open ? 'true' : 'false');
			};

			btn.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				var open = li.getAttribute('data-open') !== 'true';
				closeAllDropdowns();
				toggle(open);
			});

			// Hover affordance on pointer devices with room for a dropdown
			li.addEventListener('mouseenter', function () {
				if (window.matchMedia('(min-width:1200px)').matches) toggle(true);
			});
			li.addEventListener('mouseleave', function () {
				if (window.matchMedia('(min-width:1200px)').matches) toggle(false);
			});
		} else {
			var link = document.createElement('a');
			link.className = 'ppc-nav__link';
			link.href = url(item.href);
			link.textContent = item.label;
			if (isActive(item.href)) link.setAttribute('aria-current', 'page');
			li.appendChild(link);
		}

		return li;
	}

	function closeAllDropdowns() {
		var open = document.querySelectorAll('.ppc-nav__item[data-open="true"]');
		for (var i = 0; i < open.length; i++) {
			open[i].setAttribute('data-open', 'false');
			var b = open[i].querySelector('.ppc-nav__link');
			if (b && b.tagName === 'BUTTON') b.setAttribute('aria-expanded', 'false');
		}
	}

	function escapeHTML(str) {
		return String(str).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	var PpcHeader = (function () {
		function render(host) {
			host.className = 'ppc-header';
			host.setAttribute('data-menu', 'closed');

			var inner = document.createElement('div');
			inner.className = 'ppc-header__inner';

			// Brand
			var brand = document.createElement('a');
			brand.className = 'ppc-brand';
			brand.href = url('index.html');
			brand.innerHTML =
				'<img src="' +
				LOGO +
				'" alt="" width="46" height="46" decoding="async">' +
				'<span class="ppc-brand__text">' +
				'<span class="ppc-brand__title">PPCs of India</span>' +
				'<span class="ppc-brand__sub">Permanent Pictorial Cancellations</span>' +
				'</span>';

			// Nav
			var nav = document.createElement('ul');
			nav.className = 'ppc-nav';
			nav.id = 'ppc-primary-nav';
			NAV.forEach(function (item) {
				nav.appendChild(buildNavItem(item));
			});

			// Actions
			var actions = document.createElement('div');
			actions.className = 'ppc-header__actions';

			var themeBtn = document.createElement('button');
			themeBtn.type = 'button';
			themeBtn.className = 'ppc-icon-btn ppc-theme-toggle';
			themeBtn.setAttribute('aria-label', 'Switch between light and dark theme');
			themeBtn.setAttribute('title', 'Switch theme');
			themeBtn.innerHTML =
				'<span class="ppc-icon--sun">' +
				ICONS.sun +
				'</span><span class="ppc-icon--moon">' +
				ICONS.moon +
				'</span>';
			themeBtn.addEventListener('click', function () {
				applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
			});

			var burger = document.createElement('button');
			burger.type = 'button';
			burger.className = 'ppc-icon-btn ppc-burger';
			burger.setAttribute('aria-label', 'Toggle navigation menu');
			burger.setAttribute('aria-expanded', 'false');
			burger.setAttribute('aria-controls', 'ppc-primary-nav');
			burger.innerHTML = '<span></span>';
			burger.addEventListener('click', function () {
				var open = host.getAttribute('data-menu') !== 'open';
				host.setAttribute('data-menu', open ? 'open' : 'closed');
				burger.setAttribute('aria-expanded', open ? 'true' : 'false');
				if (!open) closeAllDropdowns();
			});

			actions.appendChild(themeBtn);
			actions.appendChild(burger);

			var progress = document.createElement('div');
			progress.className = 'ppc-progress';

			inner.appendChild(brand);
			inner.appendChild(nav);
			inner.appendChild(actions);
			host.appendChild(inner);
			host.appendChild(progress);

			// Elevate the header once the page scrolls, and drive the progress bar.
			var onScroll = function () {
				var y = window.pageYOffset || document.documentElement.scrollTop;
				host.setAttribute('data-scrolled', y > 4 ? 'true' : 'false');
				var doc = document.documentElement;
				var max = doc.scrollHeight - window.innerHeight;
				progress.style.width = max > 0 ? (y / max) * 100 + '%' : '0';
			};
			window.addEventListener('scroll', onScroll, { passive: true });
			window.addEventListener('resize', onScroll);
			onScroll();

			// Dismiss menus on outside click / Escape.
			document.addEventListener('click', function (e) {
				if (!host.contains(e.target)) {
					closeAllDropdowns();
					host.setAttribute('data-menu', 'closed');
					burger.setAttribute('aria-expanded', 'false');
				}
			});
			document.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') {
					closeAllDropdowns();
					host.setAttribute('data-menu', 'closed');
					burger.setAttribute('aria-expanded', 'false');
				}
			});
		}

		if (typeof window.HTMLElement !== 'function') return null;

		var Cls = function () {
			return Reflect.construct(HTMLElement, [], Cls);
		};
		Cls.prototype = Object.create(HTMLElement.prototype);
		Cls.prototype.constructor = Cls;
		Object.setPrototypeOf(Cls, HTMLElement);
		Cls.prototype.connectedCallback = function () {
			if (this.dataset.rendered) return;
			this.dataset.rendered = '1';
			render(this);
		};
		return Cls;
	})();

	/* ------------------------------------------------------------ <ppc-footer> */

	var PpcFooter = (function () {
		function render(host) {
			host.className = 'ppc-footer';

			var explore = [
				{ label: 'Index', href: 'index.html' },
				{ label: 'PPC List', href: 'list-pincode.html' },
				{ label: 'Know About PPCs', href: 'blog/blog-main.html' },
				{ label: 'Stamp Maps', href: 'stamp-maps.html' }
			];
			var collect = [
				{ label: 'Special Cancellations', href: 'special-cancellations.html' },
				{ label: 'How to Collect?', href: 'how-to-collect.html' },
				{ label: 'Address', href: 'address.html' },
				{ label: 'Copyright Notice', href: 'copyright-notice.html' }
			];

			function list(items) {
				return (
					'<ul>' +
					items
						.map(function (i) {
							return '<li><a href="' + url(i.href) + '">' + escapeHTML(i.label) + '</a></li>';
						})
						.join('') +
					'</ul>'
				);
			}

			var year = new Date().getFullYear();

			host.innerHTML =
				'<div class="ppc-footer__inner">' +
				'<div class="ppc-footer__rule"></div>' +
				'<div class="ppc-footer__grid">' +
				'<div>' +
				'<a class="ppc-footer__brand" href="' +
				url('index.html') +
				'"><img src="' +
				LOGO +
				'" alt="" width="52" height="52" decoding="async">' +
				'<span>Permanent Pictorial<br>Cancellations of India</span></a>' +
				'<p class="ppc-footer__blurb">A philatelic record of the permanent pictorial and special ' +
				'cancellations of India Post — documenting the monuments, wildlife and heritage stamped ' +
				'across the country\'s post offices.</p>' +
				'</div>' +
				'<nav aria-label="Explore"><h2>Explore</h2>' +
				list(explore) +
				'</nav>' +
				'<nav aria-label="Collecting"><h2>Collecting</h2>' +
				list(collect) +
				'</nav>' +
				'<nav aria-label="Connect" class="ppc-footer__contact"><h2>Connect</h2>' +
				'<ul><li><a href="' +
				url('contact.html') +
				'">' +
				ICONS.mail +
				'Contact</a></li></ul></nav>' +
				'</div>' +
				'<div class="ppc-footer__bar">' +
				'<p>&copy; 2023–' +
				year +
				' PPCs of India by Chunduru Praneeth Sai. All rights reserved.</p>' +
				'<p><a href="' +
				url('copyright-notice.html') +
				'">Copyright Notice</a></p>' +
				'</div>' +
				'</div>';

			// Back-to-top control lives with the footer.
			if (!document.querySelector('.ppc-to-top')) {
				var top = document.createElement('button');
				top.type = 'button';
				top.className = 'ppc-to-top';
				top.setAttribute('aria-label', 'Back to top');
				top.innerHTML = ICONS.arrowUp;
				top.addEventListener('click', function () {
					window.scrollTo({ top: 0, behavior: 'smooth' });
				});
				document.body.appendChild(top);

				var onScroll = function () {
					var y = window.pageYOffset || document.documentElement.scrollTop;
					top.setAttribute('data-visible', y > 400 ? 'true' : 'false');
				};
				window.addEventListener('scroll', onScroll, { passive: true });
				onScroll();
			}
		}

		if (typeof window.HTMLElement !== 'function') return null;

		var Cls = function () {
			return Reflect.construct(HTMLElement, [], Cls);
		};
		Cls.prototype = Object.create(HTMLElement.prototype);
		Cls.prototype.constructor = Cls;
		Object.setPrototypeOf(Cls, HTMLElement);
		Cls.prototype.connectedCallback = function () {
			if (this.dataset.rendered) return;
			this.dataset.rendered = '1';
			render(this);
		};
		return Cls;
	})();

	/* ------------------------------------------------------------- definition */

	if (window.customElements) {
		if (PpcHeader && !window.customElements.get('ppc-header')) {
			window.customElements.define('ppc-header', PpcHeader);
		}
		if (PpcFooter && !window.customElements.get('ppc-footer')) {
			window.customElements.define('ppc-footer', PpcFooter);
		}
	}

	/* --------------------------------------------- legacy placeholder support
	   Older pages carry <div id="navbar-placeholder"> / <div id="footer-placeholder">.
	   Upgrade them in place so nothing has to be edited twice. */

	function upgradePlaceholders() {
		var map = [
			['navbar-placeholder', 'ppc-header'],
			['footer-placeholder', 'ppc-footer']
		];
		map.forEach(function (pair) {
			var node = document.getElementById(pair[0]);
			if (!node || node.dataset.upgraded) return;
			node.dataset.upgraded = '1';
			var el = document.createElement(pair[1]);
			node.parentNode.replaceChild(el, node);
		});
	}

	/* ------------------------------------------------- content shell wrapping
	   Give the existing .container its layout wrapper so the sticky footer and
	   vertical rhythm work without touching each page's markup. */

	function wrapMain() {
		if (document.querySelector('.ppc-main')) return;

		// Case 1: the page already has a native <main> — just adopt it, and give
		// its loose children a centred container so they are not edge-to-edge.
		var existing = document.querySelector('body > main');
		if (existing) {
			existing.classList.add('ppc-main');
			if (!existing.id) existing.id = 'main';

			// Site chrome must never be wrapped into the content column: nested
			// inside it the footer inherits the reading measure and its
			// background band stops spanning the window. Lift any chrome that
			// the page markup left inside <main> out to body level first.
			var strays = existing.querySelectorAll('ppc-footer, ppc-header');
			for (var s = 0; s < strays.length; s++) {
				document.body.appendChild(strays[s]);
			}

			var inner = document.createElement('div');
			inner.className = 'ppc-container';
			while (existing.firstChild) inner.appendChild(existing.firstChild);
			existing.appendChild(inner);

			// A bare <header> on such pages is page content, not site chrome:
			// fold its heading into the same measure.
			var pageHeader = document.querySelector('body > header');
			if (pageHeader) {
				var wrap = document.createElement('div');
				wrap.className = 'ppc-container';
				while (pageHeader.firstChild) wrap.appendChild(pageHeader.firstChild);
				pageHeader.appendChild(wrap);
				pageHeader.classList.add('ppc-page-header');
			}
			addSkipLink();
			return;
		}

		// Case 2: the common .container layout.
		var containers = [];
		var kids = document.body.children;
		for (var i = 0; i < kids.length; i++) {
			if (kids[i].classList && kids[i].classList.contains('container')) containers.push(kids[i]);
		}
		if (!containers.length) return;

		var main = document.createElement('main');
		main.className = 'ppc-main';
		main.id = 'main';
		containers[0].parentNode.insertBefore(main, containers[0]);
		containers.forEach(function (c) {
			main.appendChild(c);
		});

		addSkipLink();
	}

	/** Skip link, for keyboard users. */
	function addSkipLink() {
		if (document.querySelector('.ppc-skip-link')) return;
		var skip = document.createElement('a');
		skip.className = 'ppc-skip-link';
		skip.href = '#main';
		skip.textContent = 'Skip to content';
		document.body.insertBefore(skip, document.body.firstChild);
	}

	function boot() {
		upgradePlaceholders();
		wrapMain();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
