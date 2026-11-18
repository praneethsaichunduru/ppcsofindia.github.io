/* ==========================================================================
   PPCs of India — PO Map
   --------------------------------------------------------------------------
   Draws the India outline (data/india-map.js) and one pin per post office in
   data/po-pins.js. Each entry carries a DIGIPIN, which is decoded here to a
   latitude/longitude. Clicking a pin opens Google Maps with directions to that
   spot; with no starting point in the link, Google uses the visitor's current
   location.

   DIGIPIN (India Post): 10 characters, each one choosing a cell of a 4x4 grid
   laid over 2.5-38.5 N, 63.5-99.5 E, each level subdividing the previous cell.
   ========================================================================== */
(function () {
	'use strict';

	var NS = 'http://www.w3.org/2000/svg';
	var GRID = ['FC98', 'J327', 'K456', 'LMPT'];
	var MAP = window.INDIA_MAP;
	var W = MAP.viewBox[2], H = MAP.viewBox[3];

	function $(id) { return document.getElementById(id); }
	function el(tag, attrs, parent) {
		var e = document.createElementNS(NS, tag);
		Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
		if (parent) parent.appendChild(e);
		return e;
	}
	function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

	/** DIGIPIN -> { lat, lon } (centre of the final cell), or null if malformed. */
	function decode(code) {
		var c = String(code).replace(/-/g, '').toUpperCase();
		if (c.length !== 10) return null;
		var minLat = 2.5, maxLat = 38.5, minLon = 63.5, maxLon = 99.5;
		for (var i = 0; i < 10; i++) {
			var r = -1, col = -1;
			for (var k = 0; k < 4; k++) {
				var at = GRID[k].indexOf(c[i]);
				if (at >= 0) { r = k; col = at; break; }
			}
			if (r < 0) return null;
			var latDiv = (maxLat - minLat) / 4, lonDiv = (maxLon - minLon) / 4;
			maxLat = maxLat - latDiv * r;
			minLat = maxLat - latDiv;
			minLon = minLon + lonDiv * col;
			maxLon = minLon + lonDiv;
		}
		return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
	}

	function project(p) {
		return { x: (p.lon - MAP.lon0) * MAP.cos * MAP.scale, y: (MAP.lat1 - p.lat) * MAP.scale };
	}

	/* Post office rank -> colour category (colours live in po-map.html as .c1 .. .c4) */
	var CATS = {
		1: { label: 'GPO / HO / PB', note: 'General and head post offices, philatelic bureaus' },
		2: { label: 'Sub post office', note: 'SO' },
		3: { label: 'Branch post office', note: 'BO' },
		4: { label: 'MDG / not known', note: 'Mukhya Dak Ghar, or rank not known' }
	};
	var CAT1 = { 'GPO-PB': 1, 'GPO': 1, 'PB': 1, 'HO-PB': 1, 'HO': 1 };
	var DRAW_ORDER = [3, 4, 2, 1]; // most important pins are drawn last, so they sit on top

	/** Rank text (e.g. "HO-PB") from an explicit field, else the last word of the name. */
	function rankOf(r) {
		var rank = String(r.rank || String(r.po || '').trim().split(/\s+/).pop()).toUpperCase();
		return rank;
	}
	function categoryOf(rank) {
		if (CAT1[rank]) return 1;
		if (rank === 'SO') return 2;
		if (rank === 'BO') return 3;
		return 4; // MDG, NA or anything unrecognised
	}

	function directionsUrl(p) {
		return 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat.toFixed(6) + ',' + p.lon.toFixed(6);
	}

	/* ------------------------------------------------------------- data */

	var pins = [], skipped = 0;
	(window.PO_PINS || []).forEach(function (r) {
		var p = decode(r.digipin);
		if (!p) { skipped++; return; }
		var xy = project(p);
		var rank = rankOf(r);
		pins.push({
			digipin: r.digipin, po: r.po, rank: rank, cat: categoryOf(rank), pincode: r.pincode, ppc: r.ppc,
			lat: p.lat, lon: p.lon, x: xy.x, y: xy.y, url: directionsUrl(p),
			text: [r.po, rank, r.pincode, r.ppc, r.digipin].join(' ').toLowerCase()
		});
	});
	var hiddenCats = {};

	/* ------------------------------------------------------------- map */

	var svg = $('map'), tip = $('mapTip'), wrap = $('mapWrap');
	svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
	var view = { x: 0, y: 0, w: W, h: H };
	var gStates = el('g', {}, svg), gPins = el('g', {}, svg);

	MAP.states.forEach(function (s) {
		var p = el('path', { d: s.d, class: 'state', 'data-name': s.name }, gStates);
		p.addEventListener('pointermove', function (e) { if (!Object.keys(pointers).length) showTip('<b>' + esc(s.name) + '</b>', e); });
		p.addEventListener('pointerleave', hideTip);
	});

	var PIN_PATH = 'M0 0C-4 -7 -8 -10 -8 -15A8 8 0 1 1 8 -15C8 -10 4 -7 0 0Z';
	pins.slice().sort(function (a, b) { return DRAW_ORDER.indexOf(a.cat) - DRAW_ORDER.indexOf(b.cat); }).forEach(function (p) {
		var a = el('a', { class: 'pin c' + p.cat, target: '_blank', rel: 'noopener noreferrer', 'aria-label': p.po + ', ' + p.pincode + '. Open directions in Google Maps' }, gPins);
		a.setAttributeNS(null, 'href', p.url);
		el('path', { d: PIN_PATH }, a);
		el('circle', { cx: 0, cy: -15, r: 3, class: 'pin-dot' }, a);
		p.node = a;
		var html = '<b>' + esc(p.po) + '</b><div><span class="chip c' + p.cat + '"></span>' + esc(p.rank) + ' &middot; ' + esc(CATS[p.cat].label) + '</div>' +
			'<div>Pincode ' + esc(p.pincode) + '</div><div>' + esc(p.ppc) + '</div>' +
			'<div class="mono">' + esc(p.digipin) + '</div><div class="hint">Click for directions in Google Maps</div>';
		a.addEventListener('pointermove', function (e) { if (!Object.keys(pointers).length) showTip(html, e); });
		a.addEventListener('pointerleave', hideTip);
		a.addEventListener('focus', function () {
			var r = a.getBoundingClientRect(), b = wrap.getBoundingClientRect();
			showTip(html, { clientX: r.left + r.width / 2, clientY: r.top }, b);
		});
		a.addEventListener('blur', hideTip);
	});

	function unit() { return view.w / (svg.clientWidth || W); } // map units per screen pixel
	function placePins() {
		var s = unit() * 0.9;
		pins.forEach(function (p) { p.node.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') scale(' + s.toFixed(4) + ')'); });
		svg.style.touchAction = view.w < W * 0.98 ? 'none' : 'pan-y';
	}
	function apply() {
		var m = W * 0.05;
		view.x = Math.max(-m, Math.min(W + m - view.w, view.x));
		view.y = Math.max(-m, Math.min(H + m - view.h, view.y));
		svg.setAttribute('viewBox', view.x.toFixed(1) + ' ' + view.y.toFixed(1) + ' ' + view.w.toFixed(1) + ' ' + view.h.toFixed(1));
		if (view.w !== pinW) { pinW = view.w; placePins(); }
	}
	var pinW = 0, frame = 0, anim = null, animFrame = 0;
	function schedule() { // pans: at most one redraw per frame
		if (!frame) frame = requestAnimationFrame(function () { frame = 0; apply(); });
	}
	// Eased move towards a target view (buttons, double-click, wheel, "Show on map")
	function animateTo(t) {
		t.h = t.w * H / W;
		anim = t;
		if (!animFrame) animFrame = requestAnimationFrame(step);
	}
	function step() {
		animFrame = 0;
		if (!anim) return;
		var k = 0.25;
		view.x += (anim.x - view.x) * k;
		view.y += (anim.y - view.y) * k;
		view.w += (anim.w - view.w) * k;
		view.h = view.w * H / W;
		if (Math.abs(anim.w - view.w) < 0.5 && Math.abs(anim.x - view.x) < 0.3 && Math.abs(anim.y - view.y) < 0.3) {
			view = { x: anim.x, y: anim.y, w: anim.w, h: anim.h };
			anim = null;
		}
		apply();
		if (anim) animFrame = requestAnimationFrame(step);
	}
	function zoomAt(factor, cx, cy, instant) {
		var b = (!instant && anim) || view; // build on where the last animation is heading
		var w = Math.max(W / 14, Math.min(W, b.w / factor)), k = w / b.w;
		var t = { x: cx - (cx - b.x) * k, y: cy - (cy - b.y) * k, w: w };
		if (instant) { anim = null; view = { x: t.x, y: t.y, w: w, h: w * H / W }; apply(); } else animateTo(t);
	}
	function toMap(clientX, clientY) {
		var r = svg.getBoundingClientRect();
		return { x: view.x + (clientX - r.left) / r.width * view.w, y: view.y + (clientY - r.top) / r.height * view.h };
	}
	function reset() { animateTo({ x: 0, y: 0, w: W }); }
	function zoomCentre(f) { var b = anim || view; zoomAt(f, b.x + b.w / 2, b.y + b.h / 2); }

	// Drag to pan, pinch to zoom, Ctrl/Cmd + wheel to zoom, double-click to zoom in.
	var pointers = {}, drag = null, moved = false, lastDist = 0;
	function dist() { var k = Object.keys(pointers); var a = pointers[k[0]], b = pointers[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
	svg.addEventListener('pointerdown', function (e) {
		pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
		moved = false;
		anim = null;
		drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
		if (Object.keys(pointers).length === 2) lastDist = dist();
	});
	window.addEventListener('pointermove', function (e) {
		if (!pointers[e.pointerId]) return;
		pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
		var n = Object.keys(pointers).length;
		if (n === 2) {
			var d = dist(), c = toMap((pointers[Object.keys(pointers)[0]].x + pointers[Object.keys(pointers)[1]].x) / 2, (pointers[Object.keys(pointers)[0]].y + pointers[Object.keys(pointers)[1]].y) / 2);
			if (lastDist) zoomAt(d / lastDist, c.x, c.y, true);
			lastDist = d;
			moved = true;
		} else if (drag && n === 1 && view.w < W * 0.98) {
			var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
			if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
			if (moved) {
				var u = unit();
				view.x = drag.vx - dx * u;
				view.y = drag.vy - dy * u;
				svg.classList.add('moving');
				schedule();
				hideTip();
			}
		}
	});
	function up(e) { delete pointers[e.pointerId]; lastDist = 0; drag = null; svg.classList.remove('moving'); }
	window.addEventListener('pointerup', up);
	window.addEventListener('pointercancel', up);
	// A drag that ends on a pin must not count as a click on it.
	svg.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
	svg.addEventListener('wheel', function (e) {
		if (!e.ctrlKey && !e.metaKey) return;
		e.preventDefault();
		var c = toMap(e.clientX, e.clientY);
		zoomAt(e.deltaY < 0 ? 1.25 : 0.8, c.x, c.y);
	}, { passive: false });
	svg.addEventListener('dblclick', function (e) { var c = toMap(e.clientX, e.clientY); zoomAt(1.8, c.x, c.y); });
	$('zoomIn').addEventListener('click', function () { zoomCentre(1.5); });
	$('zoomOut').addEventListener('click', function () { zoomCentre(1 / 1.5); });
	$('zoomReset').addEventListener('click', reset);
	window.addEventListener('resize', function () { pinW = 0; apply(); });

	/* ------------------------------------------------------------- tooltip */

	function showTip(html, e, boxOverride) {
		tip.innerHTML = html;
		tip.hidden = false;
		var b = boxOverride || wrap.getBoundingClientRect();
		var left = e.clientX - b.left + 14, top = e.clientY - b.top + 14;
		if (left + tip.offsetWidth > wrap.clientWidth) left = e.clientX - b.left - tip.offsetWidth - 14;
		tip.style.left = Math.max(0, left) + 'px';
		tip.style.top = Math.max(0, Math.min(top, wrap.clientHeight - tip.offsetHeight)) + 'px';
	}
	function hideTip() { tip.hidden = true; }

	/* ------------------------------------------------------------- list + search */

	function locate(p) {
		var w = W / 5;
		animateTo({ x: p.x - w / 2, y: p.y - w * H / W / 2, w: w });
		p.node.classList.add('flash');
		setTimeout(function () { p.node.classList.remove('flash'); }, 1600);
		wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	var tbody = $('poRows');
	pins.forEach(function (p) {
		var tr = document.createElement('tr');
		tr.innerHTML = '<td>' + esc(p.po) + '</td><td><span class="chip c' + p.cat + '"></span>' + esc(p.rank) + '</td><td>' + esc(p.pincode) + '</td><td>' + esc(p.ppc) + '</td><td class="mono">' + esc(p.digipin) +
			'</td><td class="acts"><button type="button" class="link-btn">Show on map</button> <a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">Directions</a></td>';
		tr.querySelector('button').addEventListener('click', function () { locate(p); });
		tbody.appendChild(tr);
		p.row = tr;
	});

	function filter() {
		var q = $('poSearch').value.trim().toLowerCase(), n = 0;
		pins.forEach(function (p) {
			var hit = (!q || p.text.indexOf(q) >= 0) && !hiddenCats[p.cat];
			p.row.hidden = !hit;
			p.node.classList.toggle('dim', !hit);
			if (hit) n++;
		});
		$('poCount').textContent = n === pins.length ? pins.length + ' post offices' : n + ' of ' + pins.length + ' post offices';
	}
	$('poSearch').addEventListener('input', filter);

	// Legend: one button per category, click to hide or show that category
	var legend = $('legend');
	[1, 2, 3, 4].forEach(function (c) {
		var count = pins.filter(function (p) { return p.cat === c; }).length;
		var b = document.createElement('button');
		b.type = 'button';
		b.className = 'legend-item';
		b.setAttribute('aria-pressed', 'true');
		b.title = CATS[c].note + ' — click to hide or show';
		b.innerHTML = '<span class="chip c' + c + '"></span>' + esc(CATS[c].label) + ' <small>(' + count + ')</small>';
		b.addEventListener('click', function () {
			hiddenCats[c] = !hiddenCats[c];
			b.setAttribute('aria-pressed', String(!hiddenCats[c]));
			filter();
		});
		legend.appendChild(b);
	});

	if (window.PO_PINS_SAMPLE) $('sampleNote').hidden = false;
	if (skipped) $('skipNote').textContent = skipped + ' entr' + (skipped === 1 ? 'y' : 'ies') + ' skipped: not a valid 10-character DIGIPIN.';
	filter();
	apply();
})();
